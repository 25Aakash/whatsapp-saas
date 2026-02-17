const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const whatsappService = require('../services/whatsapp.service');
const Message = require('../models/Message');
const logger = require('../utils/logger');

let outboundWorker = null;

/**
 * Process an outbound message job
 * Used for async/scheduled message sending
 */
const processOutboundMessage = async (job) => {
  const { tenantId, phoneNumberId, to, type, body, templateName, language, components, messageId } = job.data;

  try {
    let result;

    if (type === 'template') {
      result = await whatsappService.sendTemplateMessage(
        tenantId,
        phoneNumberId,
        to,
        templateName,
        language,
        components
      );
    } else {
      result = await whatsappService.sendTextMessage(
        tenantId,
        phoneNumberId,
        to,
        body
      );
    }

    // Update message with waMessageId if we have a local message record
    if (messageId && result.waMessageId) {
      await Message.findByIdAndUpdate(messageId, {
        waMessageId: result.waMessageId,
        status: 'sent',
        'statusTimestamps.sent': new Date(),
      });
    }

    logger.info(`Outbound message sent via queue: ${result.waMessageId}`);
    return result;
  } catch (error) {
    // Update message as failed if we have a local record
    if (messageId) {
      await Message.findByIdAndUpdate(messageId, {
        status: 'failed',
        'statusTimestamps.failed': new Date(),
        errorInfo: {
          code: error.statusCode || 500,
          title: 'Send Failed',
          details: error.message,
        },
      });
    }

    logger.error(`Outbound worker error:`, error.message);
    throw error;
  }
};

/**
 * Start the outbound message worker
 */
const startOutboundWorker = () => {
  const connection = getRedisConnection();

  outboundWorker = new Worker('outbound-messages', processOutboundMessage, {
    connection,
    concurrency: 5,
    limiter: { max: 30, duration: 1000 }, // Respect WhatsApp API rate limits
  });

  outboundWorker.on('completed', (job) => {
    logger.debug(`Outbound job completed: ${job.id}`);
  });

  outboundWorker.on('failed', (job, err) => {
    logger.error(`Outbound job failed: ${job?.id}`, err.message);
  });

  logger.info('Outbound message worker started');
  return outboundWorker;
};

module.exports = { startOutboundWorker };
