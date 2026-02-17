const messageService = require('../services/message.service');
const { apiResponse, paginatedResponse, parsePagination } = require('../utils/helpers');

/**
 * GET /api/v1/messages/:conversationId
 * Get messages for a conversation (paginated)
 */
const getMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { messages, total } = await messageService.getMessages(
      req.params.conversationId,
      req.tenantId,
      { skip, limit }
    );
    return paginatedResponse(res, messages, total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/messages/send
 * Send a text message
 */
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, body } = req.body;
    const message = await messageService.sendTextMessage({
      tenantId: req.tenantId,
      conversationId,
      body,
      sentBy: req.user._id,
    });
    return apiResponse(res, 201, 'Message sent', { message });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/messages/send-template
 * Send a template message
 */
const sendTemplate = async (req, res, next) => {
  try {
    const { conversationId, templateName, language, components } = req.body;
    const message = await messageService.sendTemplateMessage({
      tenantId: req.tenantId,
      conversationId,
      templateName,
      language,
      components,
      sentBy: req.user._id,
    });
    return apiResponse(res, 201, 'Template message sent', { message });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMessages, sendMessage, sendTemplate };
