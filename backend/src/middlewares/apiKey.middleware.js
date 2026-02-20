const ApiKey = require('../models/ApiKey');
const { apiResponse } = require('../utils/helpers');

/**
 * API Key authentication middleware
 * Supports both header-based (X-API-Key) and query-based (?api_key=) auth
 * Can be used alongside JWT — if JWT is present, it takes priority
 */
const authenticateApiKey = async (req, res, next) => {
  // Skip if already authenticated via JWT
  if (req.user) return next();

  const rawKey = req.headers['x-api-key'] || req.query.api_key;
  if (!rawKey) {
    return apiResponse(res, 401, 'Authentication required. Provide a Bearer token or X-API-Key header.');
  }

  try {
    const apiKey = await ApiKey.findByKey(rawKey);
    if (!apiKey) {
      return apiResponse(res, 401, 'Invalid API key.');
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return apiResponse(res, 401, 'API key has expired.');
    }

    // Check IP whitelist
    if (apiKey.allowedIps.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!apiKey.allowedIps.includes(clientIp)) {
        return apiResponse(res, 403, 'IP address not allowed for this API key.');
      }
    }

    // Update last used
    apiKey.lastUsedAt = new Date();
    await apiKey.save();

    // Attach tenant and key info to request
    req.tenantId = apiKey.tenant._id;
    req.apiKey = apiKey;
    req.user = { role: 'api', tenant: apiKey.tenant._id };
    req.isApiKey = true;

    next();
  } catch (error) {
    return apiResponse(res, 500, 'API key authentication error.');
  }
};

/**
 * Check if the API key (or user) has a specific permission
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    // JWT-authenticated users bypass permission checks (use RBAC instead)
    if (!req.isApiKey) return next();

    const keyPermissions = req.apiKey?.permissions || [];
    const hasPermission = permissions.some((p) => keyPermissions.includes(p));

    if (!hasPermission) {
      return apiResponse(res, 403, `API key missing required permission: ${permissions.join(' or ')}`);
    }

    next();
  };
};

module.exports = { authenticateApiKey, requirePermission };
