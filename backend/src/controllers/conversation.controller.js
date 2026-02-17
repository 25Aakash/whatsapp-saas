const conversationService = require('../services/conversation.service');
const { apiResponse, paginatedResponse, parsePagination } = require('../utils/helpers');

/**
 * GET /api/v1/conversations
 * List conversations (tenant-scoped for customers, all for admin)
 */
const listConversations = async (req, res, next) => {
  try {
    // Admin can optionally filter by tenant, customers see only their own
    let tenantId = req.tenantId;

    if (req.user.role === 'admin') {
      tenantId = req.query.tenantId || null; // Admin can pass tenantId as query param
    }

    if (!tenantId && req.user.role !== 'admin') {
      return apiResponse(res, 400, 'No WhatsApp account connected yet. Please connect via Embedded Signup first.');
    }

    const { page, limit, skip } = parsePagination(req.query);
    const { status, search } = req.query;

    const { conversations, total } = await conversationService.listConversations(tenantId, {
      skip,
      limit,
      status,
      search,
    });

    return paginatedResponse(res, conversations, total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/conversations/:id
 * Get conversation by ID
 */
const getConversation = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' ? null : req.tenantId;
    const conversation = await conversationService.getConversationById(
      req.params.id,
      tenantId
    );
    return apiResponse(res, 200, 'Conversation fetched', { conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/conversations/:id/read
 * Mark conversation as read
 */
const markRead = async (req, res, next) => {
  try {
    const conversation = await conversationService.markConversationRead(
      req.params.id,
      req.tenantId
    );
    return apiResponse(res, 200, 'Conversation marked as read', { conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/conversations/:id/assign
 * Assign team member to conversation
 */
const assignAgent = async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const conversation = await conversationService.assignAgent(
      req.params.id,
      agentId,
      req.tenantId
    );
    return apiResponse(res, 200, 'Team member assigned', { conversation });
  } catch (error) {
    next(error);
  }
};

module.exports = { listConversations, getConversation, markRead, assignAgent };
