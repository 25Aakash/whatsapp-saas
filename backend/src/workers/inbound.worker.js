const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const messageService = require('../services/message.service');
const tenantService = require('../services/tenant.service');
const autoReplyService = require('../services/autoReply.service');
const contactService = require('../services/contact.service');
const { forwardWebhookEvent } = require('../services/webhook.service');
const { trackMessageUsage } = require('../middlewares/usage.middleware');
const whatsappService = require('../services/whatsapp.service');
const flowService = require('../services/flow.service');
const logger = require('../utils/logger');

let inboundWorker = null;
let ioGetter = null;

/**
 * Set Socket.IO getter for emitting real-time events
 */
const setIOGetter = (getter) => {
  ioGetter = getter;
};

/**
 * Process a single inbound message from webhook payload
 */
const processInboundMessage = async (job) => {
  const { phoneNumberId, message, contact } = job.data;

  try {
    // Resolve tenant from phone number ID
    const tenant = await tenantService.getTenantByPhoneNumberId(phoneNumberId);
    if (!tenant) {
      logger.warn(`No tenant found for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    // Extract message body based on type
    let body = '';
    let type = message.type || 'text';
    let media = null;

    switch (type) {
      case 'text':
        body = message.text?.body || '';
        break;
      case 'image':
        body = message.image?.caption || '[Image]';
        media = { id: message.image?.id, mimeType: message.image?.mime_type, caption: message.image?.caption };
        break;
      case 'video':
        body = message.video?.caption || '[Video]';
        media = { id: message.video?.id, mimeType: message.video?.mime_type, caption: message.video?.caption };
        break;
      case 'audio':
        body = '[Audio]';
        media = { id: message.audio?.id, mimeType: message.audio?.mime_type };
        break;
      case 'document':
        body = message.document?.caption || `[Document: ${message.document?.filename || 'file'}]`;
        media = {
          id: message.document?.id,
          mimeType: message.document?.mime_type,
          filename: message.document?.filename,
          caption: message.document?.caption,
        };
        break;
      case 'location':
        body = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
        break;
      case 'contacts':
        body = '[Contact]';
        break;
      case 'sticker':
        body = '[Sticker]';
        media = { id: message.sticker?.id, mimeType: message.sticker?.mime_type };
        break;
      case 'reaction':
        body = message.reaction?.emoji || '[Reaction]';
        break;
      case 'interactive':
        body = message.interactive?.body?.text || '[Interactive]';
        break;
      default:
        body = `[${type}]`;
        type = 'unknown';
    }

    // Save message
    const result = await messageService.saveInboundMessage({
      tenantId: tenant._id,
      waMessageId: message.id,
      from: message.from,
      customerName: contact?.profile?.name || null,
      type,
      body,
      media,
      timestamp: message.timestamp,
      context: message.context || null,
    });

    if (result) {
      logger.info(`Inbound message saved: ${message.id} for tenant ${tenant._id}`);

      // Track usage
      trackMessageUsage(tenant._id, 'inbound', type);

      // Upsert contact
      try {
        await contactService.upsertContact(tenant._id, {
          phone: message.from,
          name: contact?.profile?.name || '',
        });
      } catch (contactErr) {
        logger.debug('Contact upsert error:', contactErr.message);
      }

      // Emit Socket.IO event
      if (ioGetter) {
        try {
          const io = ioGetter();
          io.to(`tenant:${tenant._id}`).emit('new-message', {
            message: result.message,
            conversation: result.conversation,
          });
          io.to(`conversation:${result.conversation._id}`).emit('new-message', {
            message: result.message,
          });
        } catch (socketErr) {
          logger.debug('Socket emit skipped (not initialized)');
        }
      }

      // Forward webhook event to tenant's URL
      forwardWebhookEvent(tenant._id, {
        type: 'message.received',
        data: {
          messageId: result.message._id,
          waMessageId: message.id,
          from: message.from,
          type,
          body,
          timestamp: message.timestamp,
          conversationId: result.conversation._id,
        },
      });

      // Flow engine evaluation (takes priority over auto-reply)
      let flowHandled = false;
      try {
        flowHandled = await flowService.handleInboundForFlow(
          tenant._id.toString(),
          tenant.phoneNumberId,
          message.from,
          body,
          result.conversation._id.toString()
        );
        if (flowHandled) {
          logger.info(`Flow engine handled message ${message.id}`);
        }
      } catch (flowErr) {
        logger.debug('Flow engine error:', flowErr.message);
      }

      // Auto-reply evaluation (skip if flow already handled)
      if (!flowHandled) try {
        const isNewConversation = result.conversation.createdAt &&
          (new Date() - new Date(result.conversation.createdAt)) < 5000; // Within 5s of creation

        const matchingRule = await autoReplyService.evaluateRules(
          tenant._id.toString(),
          body,
          result.conversation._id.toString()
        );

        if (matchingRule) {
          if (matchingRule.action.type === 'text_reply' && matchingRule.action.message) {
            // Send auto-reply text
            await whatsappService.sendTextMessage(
              tenant._id, tenant.phoneNumberId, message.from, matchingRule.action.message
            );
            // Save auto-reply message
            await messageService.saveOutboundAutoReply({
              tenantId: tenant._id,
              conversationId: result.conversation._id,
              body: matchingRule.action.message,
              to: message.from,
              phoneNumberId: tenant.phoneNumberId,
            });
            logger.info(`Auto-reply sent for rule: ${matchingRule.name}`);
          }
        }
      } catch (autoReplyErr) {
        logger.debug('Auto-reply evaluation error:', autoReplyErr.message);
      }
    }
  } catch (error) {
    logger.error(`Inbound worker error for message ${message?.id}:`, error.message);
    throw error; // BullMQ will retry
  }
};

/**
 * Start the inbound message worker
 */
const startInboundWorker = () => {
  const connection = getRedisConnection();

  inboundWorker = new Worker('inbound-messages', processInboundMessage, {
    connection,
    concurrency: 5,
    limiter: { max: 50, duration: 1000 },
  });

  inboundWorker.on('completed', (job) => {
    logger.debug(`Inbound job completed: ${job.id}`);
  });

  inboundWorker.on('failed', (job, err) => {
    logger.error(`Inbound job failed: ${job?.id}`, err.message);
  });

  logger.info('Inbound message worker started');
  return inboundWorker;
};

module.exports = { startInboundWorker, setIOGetter };
