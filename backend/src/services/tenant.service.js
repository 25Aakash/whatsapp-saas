const axios = require('axios');
const Tenant = require('../models/Tenant');
const { encrypt, decrypt } = require('../utils/crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Create a new tenant (basic, before Embedded Signup)
 */
const createTenant = async ({ name }) => {
  const tenant = await Tenant.create({
    name,
    onboardingStatus: 'pending',
  });
  return tenant;
};

/**
 * Handle Meta Embedded Signup callback
 * Exchange auth code for token, fetch WABA details, subscribe webhook
 */
const handleEmbeddedSignup = async (code, tenantId = null) => {
  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: env.metaAppId,
        client_secret: env.metaAppSecret,
        code,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Debug token to get granted scopes and WABA info
    const debugResponse = await axios.get(`${META_GRAPH_URL}/debug_token`, {
      params: {
        input_token: accessToken,
        access_token: `${env.metaAppId}|${env.metaAppSecret}`,
      },
    });

    const debugData = debugResponse.data.data;
    const granularScopes = debugData.granular_scopes || [];

    // Extract WABA IDs from scopes
    const wabaScope = granularScopes.find(
      (s) => s.scope === 'whatsapp_business_management'
    );
    const wabaIds = wabaScope?.target_ids || [];

    if (wabaIds.length === 0) {
      throw new ApiError(400, 'No WhatsApp Business Account was shared during signup');
    }

    const wabaId = wabaIds[0]; // Use first WABA

    // Step 3: Get phone numbers for this WABA
    const phonesResponse = await axios.get(
      `${META_GRAPH_URL}/${wabaId}/phone_numbers`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const phones = phonesResponse.data.data || [];
    if (phones.length === 0) {
      throw new ApiError(400, 'No phone numbers found for the WhatsApp Business Account');
    }

    const phone = phones[0]; // Use first phone number

    // Step 4: Subscribe phone number to webhook
    try {
      await axios.post(
        `${META_GRAPH_URL}/${wabaId}/subscribed_apps`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      logger.info(`Webhook subscribed for WABA: ${wabaId}`);
    } catch (subErr) {
      logger.warn(`Webhook subscription warning: ${subErr.message}`);
    }

    // Step 5: Get WABA details
    const wabaDetails = await axios.get(`${META_GRAPH_URL}/${wabaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: 'name,timezone_id,account_review_status' },
    });

    // Step 5b: Get the Facebook user ID (needed for Meta data deletion callback)
    let fbUserId = null;
    try {
      fbUserId = debugData.user_id || null;
      if (!fbUserId) {
        // Fallback: fetch from /me endpoint
        const meResponse = await axios.get(`${META_GRAPH_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id' },
        });
        fbUserId = meResponse.data.id || null;
      }
      logger.info(`Captured FB user ID during signup: ${fbUserId}`);
    } catch (fbErr) {
      logger.warn(`Could not fetch FB user ID during signup: ${fbErr.message}`);
    }

    // Step 6: Create or update tenant with credentials
    const tenantData = {
      phoneNumberId: phone.id,
      businessAccountId: wabaId,
      accessToken: encrypt(accessToken),
      displayPhoneNumber: phone.display_phone_number,
      qualityRating: phone.quality_rating || 'UNKNOWN',
      onboardingStatus: 'connected',
      isActive: true,
      meta: {
        wabaId,
        businessName: wabaDetails.data.name || '',
        timezone: wabaDetails.data.timezone_id || '',
        fbUserId,
      },
    };

    let tenant;
    if (tenantId) {
      tenant = await Tenant.findByIdAndUpdate(tenantId, tenantData, { new: true });
    } else {
      tenant = await Tenant.create({
        name: wabaDetails.data.name || 'New Business',
        ...tenantData,
      });
    }

    logger.info(`Tenant onboarded via Embedded Signup: ${tenant._id}, phone: ${phone.display_phone_number}`);
    return tenant;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Embedded Signup error:', error.response?.data || error.message);
    throw new ApiError(
      500,
      `Failed to complete WhatsApp setup: ${error.response?.data?.error?.message || error.message}`
    );
  }
};

/**
 * Get tenant by phone number ID (for webhook routing)
 */
const getTenantByPhoneNumberId = async (phoneNumberId) => {
  const tenant = await Tenant.findOne({ phoneNumberId, isActive: true });
  return tenant;
};

/**
 * Get decrypted access token for a tenant
 */
const getDecryptedToken = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select('+accessToken');
  if (!tenant || !tenant.accessToken) {
    throw new ApiError(404, 'Tenant not found or no access token configured');
  }
  return decrypt(tenant.accessToken);
};

/**
 * List all tenants
 */
const listTenants = async (filter = {}) => {
  const tenants = await Tenant.find(filter).sort({ createdAt: -1 });
  return tenants;
};

/**
 * Get tenant by ID
 */
const getTenantById = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }
  return tenant;
};

/**
 * Update tenant
 */
const updateTenant = async (tenantId, updates) => {
  // If access token is being updated, encrypt it
  if (updates.accessToken) {
    updates.accessToken = encrypt(updates.accessToken);
  }
  const tenant = await Tenant.findByIdAndUpdate(tenantId, updates, { new: true });
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }
  return tenant;
};

/**
 * Deactivate tenant
 */
const deactivateTenant = async (tenantId) => {
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { isActive: false, onboardingStatus: 'disconnected' },
    { new: true }
  );
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }
  return tenant;
};

/**
 * Check tenant connection health
 */
const checkTenantHealth = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  if (!tenant.accessToken || !tenant.phoneNumberId) {
    return { status: 'not_connected', message: 'WhatsApp not connected' };
  }

  try {
    const token = decrypt(tenant.accessToken);
    const response = await axios.get(
      `${META_GRAPH_URL}/${tenant.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { fields: 'display_phone_number,quality_rating,verified_name' },
      }
    );

    return {
      status: 'healthy',
      phoneNumber: response.data.display_phone_number,
      qualityRating: response.data.quality_rating,
      verifiedName: response.data.verified_name,
    };
  } catch (error) {
    logger.warn(`Tenant health check failed for ${tenantId}: ${error.message}`);
    return {
      status: 'error',
      message: error.response?.data?.error?.message || 'Failed to verify connection',
    };
  }
};

module.exports = {
  createTenant,
  handleEmbeddedSignup,
  getTenantByPhoneNumberId,
  getDecryptedToken,
  listTenants,
  getTenantById,
  updateTenant,
  deactivateTenant,
  checkTenantHealth,
};
