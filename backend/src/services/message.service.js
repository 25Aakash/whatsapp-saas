const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const conversationService = require('./conversation.service');
const whatsappService = require('./whatsapp.service');
const Tenant = require('../models/Tenant');
const { ApiError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * Save an inbound message (from webhook)
 * Returns null if message is a duplicate
 */
const saveInboundMessage = async ({
  tenantId,
  waMessageId,
  from,
  customerName,
  type,
  body,
  media,
  timestamp,
  context,
}) => {
  // Dedup check
  const existing = await Message.findOne({ tenant: tenantId, waMessageId });
  if (existing) {
    logger.debug(`Duplicate message ignored: ${waMessageId}`);
    return null;
  }

  // Get or create conversation
  const conversation = await conversationService.getOrCreateConversation(
    tenantId,
    from,
    customerName
  );

  // Create message
  const message = await Message.create({
    tenant: tenantId,
    conversation: conversation._id,
    waMessageId,
    direction: 'inbound',
    type: type || 'text',
    body: body || '',
    media: media || undefined,
    status: 'delivered', // Inbound messages are already delivered
    timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
    context: context ? { messageId: context.id } : undefined,
  });

  // Update conversation
  await conversationService.updateConversationForMessage(conversation._id, {
    body: body || `[${type}]`,
    direction: 'inbound',
    timestamp: message.timestamp,
  });

  return { message, conversation };
};

/**
 * Send a text message and save to DB
 */
const sendTextMessage = async ({ tenantId, conversationId, body, sentBy }) => {
  const conversation = await conversationService.getConversationById(conversationId, tenantId);
  const tenant = await Tenant.findById(tenantId);

  if (!tenant || !tenant.phoneNumberId) {
    throw new ApiError(400, 'Tenant WhatsApp not configured');
  }

  // Check 24-hour window
  const windowOpen = conversation.isWindowOpen();
  if (!windowOpen) {
    throw new ApiError(
      400,
      'Conversation window has expired. Please send a template message to re-initiate.'
    );
  }

  // Send via WhatsApp API
  const result = await whatsappService.sendTextMessage(
    tenantId,
    tenant.phoneNumberId,
    conversation.customerPhone,
    body
  );

  // Save to database
  const message = await Message.create({
    tenant: tenantId,
    conversation: conversationId,
    waMessageId: result.waMessageId,
    direction: 'outbound',
    type: 'text',
    body,
    status: 'sent',
    statusTimestamps: { sent: new Date() },
    timestamp: new Date(),
    sentBy,
  });

  // Update conversation
  await conversationService.updateConversationForMessage(conversationId, {
    body,
    direction: 'outbound',
    timestamp: message.timestamp,
  });

  return message;
};

/**
 * Send a template message and save to DB
 */
const sendTemplateMessage = async ({
  tenantId,
  conversationId,
  templateName,
  language,
  components,
  sentBy,
}) => {
  const conversation = await conversationService.getConversationById(conversationId, tenantId);
  const tenant = await Tenant.findById(tenantId);

  if (!tenant || !tenant.phoneNumberId) {
    throw new ApiError(400, 'Tenant WhatsApp not configured');
  }

  // Templates can be sent anytime (no window restriction)
  const result = await whatsappService.sendTemplateMessage(
    tenantId,
    tenant.phoneNumberId,
    conversation.customerPhone,
    templateName,
    language,
    components
  );

  // Save to database
  const message = await Message.create({
    tenant: tenantId,
    conversation: conversationId,
    waMessageId: result.waMessageId,
    direction: 'outbound',
    type: 'template',
    body: `[Template: ${templateName}]`,
    templateName,
    templateLanguage: language,
    templateComponents: components,
    status: 'sent',
    statusTimestamps: { sent: new Date() },
    timestamp: new Date(),
    sentBy,
  });

  // Update conversation
  await conversationService.updateConversationForMessage(conversationId, {
    body: `[Template: ${templateName}]`,
    direction: 'outbound',
    timestamp: message.timestamp,
  });

  return message;
};

/**
 * Save an auto-reply outbound message (used by inbound worker)
 */
const saveOutboundAutoReply = async ({ tenantId, conversationId, body, to, phoneNumberId }) => {
  const message = await Message.create({
    tenant: tenantId,
    conversation: conversationId,
    direction: 'outbound',
    type: 'text',
    body,
    status: 'sent',
    statusTimestamps: { sent: new Date() },
    timestamp: new Date(),
  });

  await conversationService.updateConversationForMessage(conversationId, {
    body,
    direction: 'outbound',
    timestamp: message.timestamp,
  });

  return message;
};

/**
 * Update message status (from webhook status update)
 */
const updateMessageStatus = async (waMessageId, status, timestamp, errorInfo = null) => {
  const statusMap = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  };

  const mappedStatus = statusMap[status];
  if (!mappedStatus) {
    logger.warn(`Unknown message status: ${status}`);
    return null;
  }

  const update = {
    status: mappedStatus,
    [`statusTimestamps.${mappedStatus}`]: timestamp ? new Date(timestamp * 1000) : new Date(),
  };

  if (errorInfo) {
    update.errorInfo = {
      code: errorInfo.code,
      title: errorInfo.title,
      details: errorInfo.message,
    };
  }

  const message = await Message.findOneAndUpdate(
    { waMessageId },
    update,
    { new: true }
  );

  if (!message) {
    logger.debug(`Message not found for status update: ${waMessageId}`);
    return null;
  }

  return message;
};

/**
 * Get messages for a conversation (paginated)
 */
const getMessages = async (conversationId, tenantId, { skip, limit }) => {
  const filter = { conversation: conversationId };
  if (tenantId) {
    filter.tenant = tenantId;
  }

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sentBy', 'name')
      .lean(),
    Message.countDocuments(filter),
  ]);

  // Return in chronological order
  return { messages: messages.reverse(), total };
};

module.exports = {
  saveInboundMessage,
  sendTextMessage,
  sendTemplateMessage,
  saveOutboundAutoReply,
  updateMessageStatus,
  getMessages,
};
