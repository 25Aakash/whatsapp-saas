const autoReplyService = require('../services/autoReply.service');
const { apiResponse } = require('../utils/helpers');

/**
 * POST /api/v1/auto-replies
 */
const createRule = async (req, res, next) => {
  try {
    const rule = await autoReplyService.createRule(req.tenantId, req.user._id, req.body);
    return apiResponse(res, 201, 'Auto-reply rule created', { rule });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auto-replies
 */
const listRules = async (req, res, next) => {
  try {
    const rules = await autoReplyService.listRules(req.tenantId);
    return apiResponse(res, 200, 'Auto-reply rules fetched', { rules });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/auto-replies/:id
 */
const updateRule = async (req, res, next) => {
  try {
    const rule = await autoReplyService.updateRule(req.tenantId, req.params.id, req.body);
    return apiResponse(res, 200, 'Auto-reply rule updated', { rule });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/auto-replies/:id
 */
const deleteRule = async (req, res, next) => {
  try {
    await autoReplyService.deleteRule(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Auto-reply rule deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { createRule, listRules, updateRule, deleteRule };
