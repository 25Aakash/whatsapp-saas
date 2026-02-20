const messageService = require('../services/message.service');
const whatsappService = require('../services/whatsapp.service');
const billingService = require('../services/billing.service');
const Conversation = require('../models/Conversation');
const Tenant = require('../models/Tenant');
const Message = require('../models/Message');
const { apiResponse, paginatedResponse, parsePagination } = require('../utils/helpers');
const { ApiError } = require('../middlewares/error.middleware');
const { trackMessageUsage } = require('../middlewares/usage.middleware');

/**
 * Check credits and deduct, or throw 402 if insufficient
 */
const enforceCredits = async (tenantId) => {
  const { allowed, balance, cost } = await billingService.checkCredits(tenantId);
  if (!allowed) {
    throw new ApiError(402, `Insufficient credits. Balance: ${balance}, cost: ${cost}`);
  }
  const result = await billingService.deductCredit(tenantId);
  if (!result.success) {
    throw new ApiError(402, 'Insufficient credits (race condition). Please try again.');
  }
  return result;
};

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
    await enforceCredits(req.tenantId);

    const { conversationId, body } = req.body;
    const message = await messageService.sendTextMessage({
      tenantId: req.tenantId,
      conversationId,
      body,
      sentBy: req.user?._id || null,
    });

    trackMessageUsage(req.tenantId, 'outbound', 'text');
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
    await enforceCredits(req.tenantId);

    const { conversationId, templateName, language, components } = req.body;
    const message = await messageService.sendTemplateMessage({
      tenantId: req.tenantId,
      conversationId,
      templateName,
      language,
      components,
      sentBy: req.user?._id || null,
    });

    trackMessageUsage(req.tenantId, 'outbound', 'template');
    return apiResponse(res, 201, 'Template message sent', { message });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/messages/send-media
 * Send a media message (image, video, audio, document, sticker)
 */
const sendMediaMessage = async (req, res, next) => {
  try {
    await enforceCredits(req.tenantId);

    const { conversationId, type, mediaId, mediaUrl, caption, filename, context } = req.body;

    if (!conversationId) throw new ApiError(400, 'conversationId is required');
    if (!type || !['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
      throw new ApiError(400, 'type must be one of: image, video, audio, document, sticker');
    }
    if (!mediaId && !mediaUrl) throw new ApiError(400, 'mediaId or mediaUrl is required');

    const conversation = await Conversation.findOne({ _id: conversationId, tenant: req.tenantId });
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant?.phoneNumberId) throw new ApiError(400, 'WhatsApp not configured');

    const mediaPayload = {
      ...(mediaId ? { id: mediaId } : { link: mediaUrl }),
      caption,
      filename,
    };

    const senderFn = {
      image: whatsappService.sendImageMessage,
      video: whatsappService.sendVideoMessage,
      audio: whatsappService.sendAudioMessage,
      document: whatsappService.sendDocumentMessage,
      sticker: whatsappService.sendStickerMessage,
    }[type];

    const result = await senderFn(
      req.tenantId,
      tenant.phoneNumberId,
      conversation.customerPhone,
      mediaPayload,
      context
    );

    // Save message locally
    const message = await Message.create({
      tenant: req.tenantId,
      conversation: conversationId,
      waMessageId: result.waMessageId,
      direction: 'outbound',
      type,
      body: caption || `[${type.charAt(0).toUpperCase() + type.slice(1)}]`,
      media: { id: mediaId, url: mediaUrl, caption, filename, mimeType: req.body.mimeType },
      status: 'sent',
      statusTimestamps: { sent: new Date() },
      sentBy: req.user?._id || null,
      timestamp: new Date(),
    });

    // Update conversation last message
    conversation.lastMessage = {
      body: caption || `[${type.charAt(0).toUpperCase() + type.slice(1)}]`,
      timestamp: new Date(),
      direction: 'outbound',
    };
    await conversation.save();

    trackMessageUsage(req.tenantId, 'outbound', type);
    return apiResponse(res, 201, `${type} message sent`, { message });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/messages/send-interactive
 * Send an interactive message (buttons, list)
 */
const sendInteractive = async (req, res, next) => {
  try {
    await enforceCredits(req.tenantId);

    const { conversationId, interactive, context } = req.body;
    if (!conversationId) throw new ApiError(400, 'conversationId is required');
    if (!interactive) throw new ApiError(400, 'interactive payload is required');

    const conversation = await Conversation.findOne({ _id: conversationId, tenant: req.tenantId });
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant?.phoneNumberId) throw new ApiError(400, 'WhatsApp not configured');

    const result = await whatsappService.sendInteractiveMessage(
      req.tenantId, tenant.phoneNumberId, conversation.customerPhone, interactive, context
    );

    const message = await Message.create({
      tenant: req.tenantId,
      conversation: conversationId,
      waMessageId: result.waMessageId,
      direction: 'outbound',
      type: 'interactive',
      body: interactive.body?.text || '[Interactive]',
      status: 'sent',
      statusTimestamps: { sent: new Date() },
      sentBy: req.user?._id || null,
      timestamp: new Date(),
    });

    conversation.lastMessage = { body: interactive.body?.text || '[Interactive]', timestamp: new Date(), direction: 'outbound' };
    await conversation.save();

    trackMessageUsage(req.tenantId, 'outbound', 'interactive');
    return apiResponse(res, 201, 'Interactive message sent', { message });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/messages/send-location
 * Send a location message
 */
const sendLocation = async (req, res, next) => {
  try {
    await enforceCredits(req.tenantId);

    const { conversationId, latitude, longitude, name, address, context } = req.body;
    if (!conversationId) throw new ApiError(400, 'conversationId is required');
    if (!latitude || !longitude) throw new ApiError(400, 'latitude and longitude are required');

    const conversation = await Conversation.findOne({ _id: conversationId, tenant: req.tenantId });
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant?.phoneNumberId) throw new ApiError(400, 'WhatsApp not configured');

    const result = await whatsappService.sendLocationMessage(
      req.tenantId, tenant.phoneNumberId, conversation.customerPhone,
      { latitude, longitude, name, address }, context
    );

    const message = await Message.create({
      tenant: req.tenantId,
      conversation: conversationId,
      waMessageId: result.waMessageId,
      direction: 'outbound',
      type: 'location',
      body: `[Location: ${latitude}, ${longitude}]`,
      status: 'sent',
      statusTimestamps: { sent: new Date() },
      sentBy: req.user?._id || null,
      timestamp: new Date(),
    });

    conversation.lastMessage = { body: name || `[Location]`, timestamp: new Date(), direction: 'outbound' };
    await conversation.save();

    trackMessageUsage(req.tenantId, 'outbound', 'location');
    return apiResponse(res, 201, 'Location message sent', { message });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/messages/send-reaction
 * Send a reaction to a message
 */
const sendReaction = async (req, res, next) => {
  try {
    const { conversationId, messageId, emoji } = req.body;
    if (!conversationId || !messageId || !emoji) {
      throw new ApiError(400, 'conversationId, messageId, and emoji are required');
    }

    const conversation = await Conversation.findOne({ _id: conversationId, tenant: req.tenantId });
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant?.phoneNumberId) throw new ApiError(400, 'WhatsApp not configured');

    const result = await whatsappService.sendReactionMessage(
      req.tenantId, tenant.phoneNumberId, conversation.customerPhone, messageId, emoji
    );

    return apiResponse(res, 201, 'Reaction sent', { waMessageId: result.waMessageId });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  sendTemplate,
  sendMediaMessage,
  sendInteractive,
  sendLocation,
  sendReaction,
};
