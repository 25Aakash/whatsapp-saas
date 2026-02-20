const scheduledMessageService = require('../services/scheduledMessage.service');
const whatsappService = require('../services/whatsapp.service');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

let schedulerInterval = null;

/**
 * Process due scheduled messages
 */
const processDueMessages = async () => {
  try {
    const dueMessages = await scheduledMessageService.getDueMessages(20);
    if (dueMessages.length === 0) return;

    logger.info(`Processing ${dueMessages.length} scheduled messages`);

    for (const scheduled of dueMessages) {
      try {
        let result;
        const tenantId = scheduled.tenant;
        const phoneNumberId = scheduled.phoneNumberId;
        const to = scheduled.contactPhone;

        switch (scheduled.type) {
          case 'template':
            result = await whatsappService.sendTemplateMessage(
              tenantId,
              phoneNumberId,
              to,
              scheduled.templateName,
              scheduled.templateLanguage || 'en_US',
              scheduled.templateComponents
            );
            break;

          case 'image':
          case 'video':
          case 'audio':
          case 'document':
            result = await whatsappService.sendMediaMessage(
              tenantId,
              phoneNumberId,
              to,
              scheduled.type,
              scheduled.mediaUrl
            );
            break;

          default:
            result = await whatsappService.sendTextMessage(
              tenantId,
              phoneNumberId,
              to,
              scheduled.body
            );
        }

        // Create a Message record
        if (result?.waMessageId) {
          // Find or create conversation
          let conversation = scheduled.conversation;
          if (!conversation) {
            conversation = await Conversation.findOne({
              tenant: tenantId,
              contactPhone: to,
              phoneNumberId,
            });
          }

          if (conversation) {
            const msg = await Message.create({
              tenant: tenantId,
              conversation: conversation._id,
              waMessageId: result.waMessageId,
              from: phoneNumberId,
              to,
              direction: 'outbound',
              type: scheduled.type === 'template' ? 'template' : scheduled.type,
              body: scheduled.body || '',
              timestamp: new Date(),
              status: 'sent',
              statusTimestamps: { sent: new Date() },
            });

            await scheduledMessageService.markSent(scheduled._id, msg._id);
          } else {
            await scheduledMessageService.markSent(scheduled._id, null);
          }
        } else {
          await scheduledMessageService.markSent(scheduled._id, null);
        }

        logger.info(`Scheduled message ${scheduled._id} sent successfully`);
      } catch (err) {
        logger.error(`Scheduled message ${scheduled._id} failed: ${err.message}`);
        await scheduledMessageService.markFailed(scheduled._id, err);
      }

      // Small delay between sends to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch (err) {
    logger.error(`Scheduler worker error: ${err.message}`);
  }
};

/**
 * Start the scheduler (polls every 30 seconds)
 */
const startSchedulerWorker = () => {
  logger.info('Scheduler worker started (polling every 30s)');
  // Run immediately once
  processDueMessages();
  // Then poll every 30 seconds
  schedulerInterval = setInterval(processDueMessages, 30000);
};

/**
 * Stop the scheduler
 */
const stopSchedulerWorker = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Scheduler worker stopped');
  }
};

module.exports = { startSchedulerWorker, stopSchedulerWorker };
