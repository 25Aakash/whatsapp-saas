const { verifyWebhookSignature } = require('../utils/crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Verify WhatsApp webhook signature using HMAC-SHA256
 * The raw body must be preserved for signature verification
 */
const verifyWebhook = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    logger.warn('Webhook request without signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  // req.rawBody is set by express raw body parser
  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error('Raw body not available for webhook verification');
    return res.status(400).json({ error: 'Unable to verify signature' });
  }

  const isValid = verifyWebhookSignature(rawBody, signature, env.whatsappAppSecret);

  if (!isValid) {
    logger.warn('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

module.exports = { verifyWebhook };
