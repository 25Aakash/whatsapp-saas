const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * SSO (Single Sign-On) Service
 * Supports SAML 2.0 and OIDC (OpenID Connect) providers
 *
 * Provider config is stored per-tenant in Tenant.sso:
 * {
 *   enabled: true,
 *   provider: 'saml' | 'oidc',
 *   // SAML
 *   entryPoint: 'https://idp.example.com/sso/saml',
 *   issuer: 'my-app',
 *   cert: '-----BEGIN CERTIFICATE-----...',
 *   // OIDC
 *   discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
 *   clientId: 'xxx',
 *   clientSecret: 'xxx',
 *   // Common
 *   callbackUrl: 'https://app.example.com/api/v1/sso/callback',
 *   defaultRole: 'customer_agent',
 *   autoProvision: true,  // auto-create users on first login
 *   domains: ['example.com'],
 * }
 */

/**
 * Get SSO config for a tenant (by domain or tenantId)
 */
const getSSOConfig = async (tenantIdOrDomain) => {
  let tenant;

  if (tenantIdOrDomain.includes('.')) {
    // Lookup by domain
    tenant = await Tenant.findOne({
      'sso.enabled': true,
      'sso.domains': tenantIdOrDomain,
      isActive: true,
    });
  } else {
    tenant = await Tenant.findById(tenantIdOrDomain);
  }

  if (!tenant || !tenant.sso?.enabled) {
    return null;
  }

  return { tenant, sso: tenant.sso };
};

/**
 * Generate SAML auth request URL
 */
const getSAMLLoginUrl = async (tenantId) => {
  const config = await getSSOConfig(tenantId);
  if (!config || config.sso.provider !== 'saml') {
    throw new ApiError(400, 'SAML SSO not configured for this tenant');
  }

  const { entryPoint, issuer, callbackUrl } = config.sso;

  // Build SAML AuthnRequest
  const requestId = `_${Date.now().toString(36)}`;
  const samlRequest = Buffer.from(`
    <samlp:AuthnRequest
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${requestId}"
      Version="2.0"
      IssueInstant="${new Date().toISOString()}"
      Destination="${entryPoint}"
      AssertionConsumerServiceURL="${callbackUrl || `${env.frontendUrl}/api/v1/sso/callback`}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer>${issuer || 'whatsapp-saas'}</saml:Issuer>
    </samlp:AuthnRequest>
  `.trim()).toString('base64');

  const loginUrl = `${entryPoint}?SAMLRequest=${encodeURIComponent(samlRequest)}&RelayState=${tenantId}`;

  return { loginUrl, requestId };
};

/**
 * Generate OIDC auth request URL
 */
const getOIDCLoginUrl = async (tenantId) => {
  const config = await getSSOConfig(tenantId);
  if (!config || config.sso.provider !== 'oidc') {
    throw new ApiError(400, 'OIDC SSO not configured for this tenant');
  }

  const { discoveryUrl, clientId, callbackUrl } = config.sso;

  // Fetch OIDC discovery document
  const axios = require('axios');
  let authEndpoint;
  try {
    const discovery = await axios.get(discoveryUrl);
    authEndpoint = discovery.data.authorization_endpoint;
  } catch (err) {
    throw new ApiError(500, `Failed to fetch OIDC discovery: ${err.message}`);
  }

  const state = Buffer.from(JSON.stringify({ tenantId, ts: Date.now() })).toString('base64');
  const redirectUri = callbackUrl || `${env.frontendUrl}/api/v1/sso/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
  });

  const loginUrl = `${authEndpoint}?${params.toString()}`;
  return { loginUrl, state };
};

/**
 * Handle SAML callback — parse assertion and create/find user
 */
const handleSAMLCallback = async (samlResponse, relayState) => {
  const tenantId = relayState;
  const config = await getSSOConfig(tenantId);
  if (!config) throw new ApiError(400, 'SSO not configured');

  // Parse SAML response (simplified — in production use passport-saml or saml2-js)
  let email, name;
  try {
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');
    // Extract email from NameID or Attribute
    const emailMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    email = emailMatch?.[1];
    const nameMatch = decoded.match(/Name="displayName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
    name = nameMatch?.[1] || email?.split('@')[0];
  } catch (err) {
    logger.error('SAML response parse error:', err.message);
    throw new ApiError(400, 'Invalid SAML response');
  }

  if (!email) throw new ApiError(400, 'No email in SAML assertion');

  return findOrCreateSSOUser(config.tenant, email, name, config.sso);
};

/**
 * Handle OIDC callback — exchange code for tokens
 */
const handleOIDCCallback = async (code, state) => {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
  } catch {
    throw new ApiError(400, 'Invalid SSO state');
  }

  const config = await getSSOConfig(parsed.tenantId);
  if (!config) throw new ApiError(400, 'SSO not configured');

  const { discoveryUrl, clientId, clientSecret, callbackUrl } = config.sso;

  const axios = require('axios');

  // Get token endpoint from discovery
  const discovery = await axios.get(discoveryUrl);
  const tokenEndpoint = discovery.data.token_endpoint;
  const userinfoEndpoint = discovery.data.userinfo_endpoint;

  // Exchange code for tokens
  const tokenResp = await axios.post(tokenEndpoint, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl || `${env.frontendUrl}/api/v1/sso/callback`,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token } = tokenResp.data;

  // Get user info
  const userInfo = await axios.get(userinfoEndpoint, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const { email, name: userName } = userInfo.data;
  if (!email) throw new ApiError(400, 'No email in OIDC response');

  return findOrCreateSSOUser(config.tenant, email, userName || email.split('@')[0], config.sso);
};

/**
 * Find or create a user from SSO data
 */
const findOrCreateSSOUser = async (tenant, email, name, ssoConfig) => {
  let user = await User.findOne({ email, tenant: tenant._id });

  if (!user) {
    if (!ssoConfig.autoProvision) {
      throw new ApiError(403, 'User not found and auto-provisioning is disabled');
    }

    // Auto-create user
    user = await User.create({
      email,
      name: name || email.split('@')[0],
      password: `SSO_${Date.now()}_${Math.random().toString(36)}`, // Random password (never used)
      role: ssoConfig.defaultRole || 'customer_agent',
      tenant: tenant._id,
      isActive: true,
    });

    logger.info(`SSO auto-provisioned user: ${email} for tenant ${tenant._id}`);
  }

  if (!user.isActive) {
    throw new ApiError(403, 'User account is deactivated');
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, role: user.role, tenant: tenant._id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  return { token, user: user.toJSON() };
};

/**
 * Update tenant SSO configuration
 */
const updateSSOConfig = async (tenantId, ssoData) => {
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { sso: ssoData } },
    { new: true }
  );
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  return tenant.sso;
};

/**
 * Initialize SSO login — returns redirect URL
 */
const initLogin = async (tenantIdOrDomain) => {
  const config = await getSSOConfig(tenantIdOrDomain);
  if (!config) {
    throw new ApiError(404, 'SSO not configured for this tenant/domain');
  }

  if (config.sso.provider === 'saml') {
    return getSAMLLoginUrl(config.tenant._id.toString());
  } else if (config.sso.provider === 'oidc') {
    return getOIDCLoginUrl(config.tenant._id.toString());
  }

  throw new ApiError(400, `Unsupported SSO provider: ${config.sso.provider}`);
};

module.exports = {
  getSSOConfig,
  initLogin,
  handleSAMLCallback,
  handleOIDCCallback,
  updateSSOConfig,
};
