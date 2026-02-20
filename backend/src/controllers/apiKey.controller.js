const apiKeyService = require('../services/apiKey.service');
const { apiResponse } = require('../utils/helpers');

/**
 * POST /api/v1/api-keys
 */
const createApiKey = async (req, res, next) => {
  try {
    const result = await apiKeyService.createApiKey(req.tenantId, req.user._id, req.body);
    return apiResponse(res, 201, 'API key created. Save the key — it won\'t be shown again.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/api-keys
 */
const listApiKeys = async (req, res, next) => {
  try {
    const keys = await apiKeyService.listApiKeys(req.tenantId);
    return apiResponse(res, 200, 'API keys fetched', { keys });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/api-keys/:id
 */
const updateApiKey = async (req, res, next) => {
  try {
    const key = await apiKeyService.updateApiKey(req.tenantId, req.params.id, req.body);
    return apiResponse(res, 200, 'API key updated', { key });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/api-keys/:id
 */
const revokeApiKey = async (req, res, next) => {
  try {
    const key = await apiKeyService.revokeApiKey(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'API key revoked', { key });
  } catch (error) {
    next(error);
  }
};

module.exports = { createApiKey, listApiKeys, updateApiKey, revokeApiKey };
