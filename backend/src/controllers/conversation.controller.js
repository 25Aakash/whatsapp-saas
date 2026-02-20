const conversationService = require('../services/conversation.service');
const Conversation = require('../models/Conversation');
const { apiResponse, paginatedResponse, parsePagination } = require('../utils/helpers');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * GET /api/v1/conversations
 * List conversations (tenant-scoped for customers, all for admin)
 */
const listConversations = async (req, res, next) => {
  try {
    // Admin can optionally filter by tenant, customers/agents see only their own
    let tenantId = req.tenantId;

    if (req.user.role === 'admin') {
      tenantId = req.query.tenantId || null; // Admin can pass tenantId as query param
    }

    // Ensure customer and customer_agent always have a tenant context
    if (!tenantId && (req.user.role === 'customer' || req.user.role === 'customer_agent')) {
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

/**
 * PUT /api/v1/conversations/:id/tags
 * Update conversation tags
 */
const updateTags = async (req, res, next) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return apiResponse(res, 400, 'Tags must be an array');
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      { $set: { tags } },
      { new: true }
    );
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    return apiResponse(res, 200, 'Tags updated', { conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/conversations/:id/notes
 * Update conversation notes
 */
const updateNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      { $set: { notes: notes || '' } },
      { new: true }
    );
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    return apiResponse(res, 200, 'Notes updated', { conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/conversations/:id/close
 * Close a conversation
 */
const closeConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      { $set: { status: 'closed' } },
      { new: true }
    );
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    return apiResponse(res, 200, 'Conversation closed', { conversation });
  } catch (error) {
    next(error);
  }
};

module.exports = { listConversations, getConversation, markRead, assignAgent, updateTags, updateNotes, closeConversation };
