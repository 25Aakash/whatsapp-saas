const ScheduledMessage = require('../models/ScheduledMessage');
const { ApiError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * Schedule a message to be sent at a future time
 */
const schedule = async (tenantId, userId, data) => {
  const { conversationId, contactPhone, phoneNumberId, type, body, templateName, templateLanguage, templateComponents, mediaUrl, mediaType, scheduledAt } = data;

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    throw new ApiError(400, 'Scheduled time must be in the future');
  }

  const msg = await ScheduledMessage.create({
    tenant: tenantId,
    conversation: conversationId || undefined,
    contactPhone,
    phoneNumberId,
    type: type || 'text',
    body,
    templateName,
    templateLanguage,
    templateComponents,
    mediaUrl,
    mediaType,
    scheduledAt: scheduledDate,
    createdBy: userId,
  });

  logger.info(`Scheduled message ${msg._id} for ${scheduledDate.toISOString()}`);
  return msg;
};

/**
 * Cancel a pending scheduled message
 */
const cancel = async (tenantId, messageId) => {
  const msg = await ScheduledMessage.findOne({ _id: messageId, tenant: tenantId });
  if (!msg) throw new ApiError(404, 'Scheduled message not found');
  if (msg.status !== 'pending') throw new ApiError(400, `Cannot cancel message with status: ${msg.status}`);

  msg.status = 'cancelled';
  await msg.save();
  return msg;
};

/**
 * List scheduled messages for a tenant
 */
const list = async (tenantId, { page = 1, limit = 20, status } = {}) => {
  const filter = { tenant: tenantId };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    ScheduledMessage.find(filter).sort({ scheduledAt: 1 }).skip(skip).limit(limit).lean(),
    ScheduledMessage.countDocuments(filter),
  ]);

  return { messages, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Get due messages (called by the scheduler worker)
 */
const getDueMessages = async (batchSize = 50) => {
  const now = new Date();
  return ScheduledMessage.find({
    status: 'pending',
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(batchSize)
    .populate('conversation');
};

/**
 * Mark a scheduled message as sent
 */
const markSent = async (messageId, resultMessageId) => {
  await ScheduledMessage.findByIdAndUpdate(messageId, {
    status: 'sent',
    sentAt: new Date(),
    resultMessageId,
  });
};

/**
 * Mark a scheduled message as failed
 */
const markFailed = async (messageId, error) => {
  await ScheduledMessage.findByIdAndUpdate(messageId, {
    status: 'failed',
    errorInfo: typeof error === 'string' ? error : error?.message || 'Unknown error',
  });
};

module.exports = { schedule, cancel, list, getDueMessages, markSent, markFailed };
