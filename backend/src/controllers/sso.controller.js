const ssoService = require('../services/sso.service');
const { catchAsync } = require('../middlewares/error.middleware');
const env = require('../config/env');

/**
 * Initiate SSO login — returns redirect URL
 * Query: ?tenant=<tenantId> or ?domain=<domain>
 */
const initLogin = catchAsync(async (req, res) => {
  const identifier = req.query.tenant || req.query.domain;
  if (!identifier) {
    return res.status(400).json({ success: false, message: 'tenant or domain query parameter required' });
  }

  const { loginUrl } = await ssoService.initLogin(identifier);
  res.json({ success: true, data: { loginUrl } });
});

/**
 * SSO Callback — handles SAML POST or OIDC code callback
 */
const callback = catchAsync(async (req, res) => {
  let result;

  if (req.body.SAMLResponse) {
    // SAML callback
    result = await ssoService.handleSAMLCallback(req.body.SAMLResponse, req.body.RelayState);
  } else if (req.query.code) {
    // OIDC callback
    result = await ssoService.handleOIDCCallback(req.query.code, req.query.state);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid SSO callback' });
  }

  // Redirect to frontend with token
  const frontendUrl = env.frontendUrl || 'http://localhost:3000';
  const redirectUrl = `${frontendUrl}/dashboard?sso_token=${result.token}`;
  res.redirect(redirectUrl);
});

/**
 * Get SSO config for authenticated tenant
 */
const getConfig = catchAsync(async (req, res) => {
  const config = await ssoService.getSSOConfig(req.user.tenant.toString());
  res.json({ success: true, data: config?.sso || null });
});

/**
 * Update SSO config for authenticated tenant (customer owner only)
 */
const updateConfig = catchAsync(async (req, res) => {
  const ssoData = req.body;
  const result = await ssoService.updateSSOConfig(req.user.tenant, ssoData);
  res.json({ success: true, data: result });
});

module.exports = { initLogin, callback, getConfig, updateConfig };
