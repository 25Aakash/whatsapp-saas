const { getQueues } = require('../queues');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * GET /api/v1/webhook
 * Webhook verification endpoint (Meta sends this during setup)
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.whatsappVerifyToken) {
    logger.info('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed', { mode, token });
  return res.status(403).json({ error: 'Verification failed' });
};

/**
 * POST /api/v1/webhook
 * Receive webhook events from WhatsApp Cloud API
 * Immediately responds 200 OK and enqueues payload for async processing
 */
const handleWebhook = async (req, res) => {
  // Always respond 200 OK immediately (Meta requires this)
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      logger.debug('Non-WhatsApp webhook event ignored');
      return;
    }

    const { inboundQueue, statusQueue } = getQueues();

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        if (!phoneNumberId) {
          logger.warn('Webhook event missing phone_number_id');
          continue;
        }

        // Process inbound messages
        if (value.messages?.length > 0) {
          for (const message of value.messages) {
            const contact = value.contacts?.find((c) => c.wa_id === message.from);
            await inboundQueue.add(
              `inbound-${message.id}`,
              {
                phoneNumberId,
                message,
                contact,
              },
              { jobId: `msg-${message.id}` } // Dedup at queue level too
            );
            logger.debug(`Enqueued inbound message: ${message.id}`);
          }
        }

        // Process status updates
        if (value.statuses?.length > 0) {
          for (const status of value.statuses) {
            await statusQueue.add(
              `status-${status.id}-${status.status}`,
              {
                phoneNumberId,
                status,
              },
              { jobId: `status-${status.id}-${status.status}` }
            );
            logger.debug(`Enqueued status update: ${status.id} -> ${status.status}`);
          }
        }
      }
    }
  } catch (error) {
    // Don't throw - we already sent 200 OK
    logger.error('Webhook processing error:', error.message);
  }
};

module.exports = { verifyWebhook, handleWebhook };
