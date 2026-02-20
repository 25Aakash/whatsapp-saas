const scheduledMessageService = require('../services/scheduledMessage.service');
const { apiResponse } = require('../utils/helpers');

/**
 * POST /api/v1/scheduled-messages
 */
const scheduleMessage = async (req, res, next) => {
  try {
    const msg = await scheduledMessageService.schedule(req.tenantId, req.user._id, req.body);
    return apiResponse(res, 201, 'Message scheduled', { scheduledMessage: msg });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/scheduled-messages
 */
const listScheduled = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const data = await scheduledMessageService.list(req.tenantId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      status,
    });
    return apiResponse(res, 200, 'Scheduled messages fetched', data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/scheduled-messages/:id/cancel
 */
const cancelScheduled = async (req, res, next) => {
  try {
    const msg = await scheduledMessageService.cancel(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Scheduled message cancelled', { scheduledMessage: msg });
  } catch (error) {
    next(error);
  }
};

module.exports = { scheduleMessage, listScheduled, cancelScheduled };
