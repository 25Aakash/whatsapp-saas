const Conversation = require('../models/Conversation');
const { ApiError } = require('../middlewares/error.middleware');
const { normalizePhone } = require('../utils/helpers');

/**
 * Get or create a conversation for a customer phone
 */
const getOrCreateConversation = async (tenantId, customerPhone, customerName = null) => {
  const phone = normalizePhone(customerPhone);

  let conversation = await Conversation.findOne({
    tenant: tenantId,
    customerPhone: phone,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      tenant: tenantId,
      customerPhone: phone,
      customerName: customerName || phone,
    });
  } else if (customerName && conversation.customerName === 'Unknown') {
    // Update name if we now have it
    conversation.customerName = customerName;
    await conversation.save();
  }

  return conversation;
};

/**
 * Update conversation after a new message
 */
const updateConversationForMessage = async (conversationId, { body, direction, timestamp }) => {
  const setFields = {
    'lastMessage.body': (body || '').substring(0, 100),
    'lastMessage.timestamp': timestamp || new Date(),
    'lastMessage.direction': direction,
  };

  const update = { $set: setFields };

  // If inbound, increment unread count and update 24h window
  if (direction === 'inbound') {
    update.$inc = { unreadCount: 1 };
    update.$set.windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    update.$set.status = 'open';
  }

  const conversation = await Conversation.findByIdAndUpdate(
    conversationId,
    update,
    { new: true }
  );

  return conversation;
};

/**
 * List conversations for a tenant (paginated)
 */
const listConversations = async (tenantId, { skip, limit, status, search }) => {
  const filter = { tenant: tenantId };

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ 'lastMessage.timestamp': -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedAgent', 'name email')
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  return { conversations, total };
};

/**
 * Get conversation by ID
 */
const getConversationById = async (conversationId, tenantId) => {
  const filter = { _id: conversationId };
  if (tenantId) {
    filter.tenant = tenantId;
  }

  const conversation = await Conversation.findOne(filter)
    .populate('assignedAgent', 'name email')
    .populate('tenant', 'name phoneNumberId displayPhoneNumber');

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  return conversation;
};

/**
 * Mark conversation as read (reset unread count)
 */
const markConversationRead = async (conversationId, tenantId) => {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenant: tenantId },
    { unreadCount: 0 },
    { new: true }
  );
  return conversation;
};

/**
 * Assign agent to conversation
 */
const assignAgent = async (conversationId, agentId, tenantId) => {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenant: tenantId },
    { assignedAgent: agentId },
    { new: true }
  ).populate('assignedAgent', 'name email');

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  return conversation;
};

module.exports = {
  getOrCreateConversation,
  updateConversationForMessage,
  listConversations,
  getConversationById,
  markConversationRead,
  assignAgent,
};
