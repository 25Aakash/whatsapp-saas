const ApiKey = require('../models/ApiKey');
const { ApiError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * Create a new API key for a tenant
 */
const createApiKey = async (tenantId, userId, { name, permissions, expiresAt, allowedIps, rateLimit }) => {
  const { rawKey, keyHash, keyPrefix } = ApiKey.generateKey();

  const apiKey = await ApiKey.create({
    tenant: tenantId,
    createdBy: userId,
    name,
    keyHash,
    keyPrefix,
    permissions: permissions || undefined,
    expiresAt: expiresAt || null,
    allowedIps: allowedIps || [],
    rateLimit: rateLimit || undefined,
  });

  logger.info(`API key created: ${keyPrefix}... for tenant ${tenantId}`);

  // Return the raw key only this one time
  return {
    id: apiKey._id,
    name: apiKey.name,
    key: rawKey,
    keyPrefix,
    permissions: apiKey.permissions,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
};

/**
 * List API keys for a tenant (without exposing the hash)
 */
const listApiKeys = async (tenantId) => {
  return ApiKey.find({ tenant: tenantId })
    .select('-keyHash')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Revoke (deactivate) an API key
 */
const revokeApiKey = async (tenantId, keyId) => {
  const key = await ApiKey.findOneAndUpdate(
    { _id: keyId, tenant: tenantId },
    { isActive: false },
    { new: true }
  ).select('-keyHash');

  if (!key) throw new ApiError(404, 'API key not found');
  logger.info(`API key revoked: ${key.keyPrefix}... for tenant ${tenantId}`);
  return key;
};

/**
 * Update API key properties
 */
const updateApiKey = async (tenantId, keyId, updates) => {
  const allowed = ['name', 'permissions', 'expiresAt', 'allowedIps', 'rateLimit', 'isActive'];
  const filtered = {};
  for (const k of allowed) {
    if (updates[k] !== undefined) filtered[k] = updates[k];
  }

  const key = await ApiKey.findOneAndUpdate(
    { _id: keyId, tenant: tenantId },
    { $set: filtered },
    { new: true }
  ).select('-keyHash');

  if (!key) throw new ApiError(404, 'API key not found');
  return key;
};

module.exports = { createApiKey, listApiKeys, revokeApiKey, updateApiKey };
