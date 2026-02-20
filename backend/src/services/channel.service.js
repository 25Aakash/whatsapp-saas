const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * Channel abstraction layer
 * Provides a unified interface for sending messages across multiple channels
 * (WhatsApp, SMS, Email, RCS)
 */

// ============ Channel Interface ============

/**
 * @typedef {Object} ChannelMessage
 * @property {string} to - Recipient identifier (phone, email, etc.)
 * @property {string} from - Sender identifier
 * @property {string} type - Message type: text, template, media, interactive
 * @property {string} body - Message body
 * @property {Object} [media] - Media payload
 * @property {Object} [template] - Template payload
 * @property {Object} [interactive] - Interactive payload
 */

// ============ WhatsApp Channel ============

const whatsappChannel = {
  name: 'whatsapp',
  async send(tenantId, message, ctx = {}) {
    const whatsappService = require('./whatsapp.service');
    const { to, type, body, template, media, interactive } = message;
    const phoneNumberId = ctx.phoneNumberId;

    switch (type) {
      case 'text':
        return whatsappService.sendTextMessage(tenantId, phoneNumberId, to, body);
      case 'template':
        return whatsappService.sendTemplateMessage(
          tenantId, phoneNumberId, to,
          template.name, template.language, template.components || []
        );
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        return whatsappService.sendMediaMessage(
          tenantId, phoneNumberId, to, type, media
        );
      case 'interactive':
        return whatsappService.sendInteractiveMessage(tenantId, phoneNumberId, to, interactive);
      default:
        return whatsappService.sendTextMessage(tenantId, phoneNumberId, to, body);
    }
  },
  async getStatus(messageId) {
    return { messageId, channel: 'whatsapp' };
  },
};

// ============ SMS Channel (Twilio) ============

const smsChannel = {
  name: 'sms',
  async send(tenantId, message, ctx = {}) {
    const { to, body } = message;
    const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = ctx;

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new ApiError(400, 'Twilio credentials not configured for this tenant');
    }

    try {
      // Dynamic import to avoid requiring twilio as a hard dependency
      const twilio = require('twilio');
      const client = twilio(twilioAccountSid, twilioAuthToken);

      const result = await client.messages.create({
        body,
        from: twilioPhoneNumber,
        to,
      });

      logger.info(`SMS sent to ${to}, SID: ${result.sid}`);
      return { messageId: result.sid, status: 'sent', channel: 'sms' };
    } catch (err) {
      logger.error('SMS send error:', err.message);
      throw new ApiError(500, `SMS send failed: ${err.message}`);
    }
  },
  async getStatus(messageId, ctx = {}) {
    try {
      const twilio = require('twilio');
      const client = twilio(ctx.twilioAccountSid, ctx.twilioAuthToken);
      const msg = await client.messages(messageId).fetch();
      return { messageId, status: msg.status, channel: 'sms' };
    } catch {
      return { messageId, status: 'unknown', channel: 'sms' };
    }
  },
};

// ============ Email Channel ============

const emailChannel = {
  name: 'email',
  async send(tenantId, message, ctx = {}) {
    const { to, body, subject } = message;
    const emailService = require('./email.service');

    await emailService.sendEmail({
      to,
      subject: subject || 'Message from support',
      html: body,
    });

    logger.info(`Email sent to ${to}`);
    return { messageId: `email_${Date.now()}`, status: 'sent', channel: 'email' };
  },
  async getStatus() {
    return { status: 'sent', channel: 'email' };
  },
};

// ============ RCS Channel (placeholder) ============

const rcsChannel = {
  name: 'rcs',
  async send(tenantId, message, ctx = {}) {
    // RCS via Google's RBM API — placeholder for future implementation
    // https://developers.google.com/business-communications/rcs-business-messaging
    const { to, body } = message;
    logger.info(`RCS message to ${to}: ${body} (RCS not yet configured)`);
    throw new ApiError(501, 'RCS channel not yet configured. Contact support to enable.');
  },
  async getStatus() {
    return { status: 'unknown', channel: 'rcs' };
  },
};

// ============ Channel Registry ============

const channels = {
  whatsapp: whatsappChannel,
  sms: smsChannel,
  email: emailChannel,
  rcs: rcsChannel,
};

/**
 * Get a channel by name
 */
const getChannel = (channelName) => {
  const channel = channels[channelName];
  if (!channel) {
    throw new ApiError(400, `Unsupported channel: ${channelName}. Available: ${Object.keys(channels).join(', ')}`);
  }
  return channel;
};

/**
 * Send a message through the specified channel
 */
const sendMessage = async (channelName, tenantId, message, ctx = {}) => {
  const channel = getChannel(channelName);
  return channel.send(tenantId, message, ctx);
};

/**
 * Send the same message through multiple channels
 */
const broadcastMessage = async (channelNames, tenantId, message, ctx = {}) => {
  const results = [];
  for (const channelName of channelNames) {
    try {
      const result = await sendMessage(channelName, tenantId, message, ctx);
      results.push({ channel: channelName, success: true, ...result });
    } catch (err) {
      results.push({ channel: channelName, success: false, error: err.message });
    }
  }
  return results;
};

/**
 * List available channels
 */
const listChannels = () => {
  return Object.keys(channels).map((name) => ({
    name,
    available: true,
  }));
};

module.exports = {
  getChannel,
  sendMessage,
  broadcastMessage,
  listChannels,
  channels,
};
