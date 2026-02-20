const cannedResponseService = require('../services/cannedResponse.service');
const { apiResponse } = require('../utils/helpers');

/**
 * POST /api/v1/canned-responses
 */
const createCannedResponse = async (req, res, next) => {
  try {
    const response = await cannedResponseService.createCannedResponse(req.tenantId, req.user._id, req.body);
    return apiResponse(res, 201, 'Canned response created', { cannedResponse: response });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/canned-responses
 */
const listCannedResponses = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const responses = await cannedResponseService.listCannedResponses(req.tenantId, { category, search });
    return apiResponse(res, 200, 'Canned responses fetched', { cannedResponses: responses });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/canned-responses/:id
 */
const updateCannedResponse = async (req, res, next) => {
  try {
    const response = await cannedResponseService.updateCannedResponse(req.tenantId, req.params.id, req.body);
    return apiResponse(res, 200, 'Canned response updated', { cannedResponse: response });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/canned-responses/:id
 */
const deleteCannedResponse = async (req, res, next) => {
  try {
    await cannedResponseService.deleteCannedResponse(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Canned response deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { createCannedResponse, listCannedResponses, updateCannedResponse, deleteCannedResponse };
