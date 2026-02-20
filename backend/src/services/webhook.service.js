const axios = require('axios');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

/**
 * Forward a webhook event to the tenant's configured webhook URL
 */
const forwardWebhookEvent = async (tenantId, event) => {
  try {
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant?.webhookUrl) return;

    // Check if this event type should be forwarded
    if (tenant.webhookEvents && tenant.webhookEvents.length > 0) {
      if (!tenant.webhookEvents.includes(event.type)) return;
    }

    const payload = {
      event: event.type,
      timestamp: new Date().toISOString(),
      tenantId: tenantId.toString(),
      data: event.data,
    };

    // Generate HMAC signature for the payload
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', tenant.webhookSecret || tenant._id.toString())
      .update(JSON.stringify(payload))
      .digest('hex');

    await axios.post(tenant.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event.type,
      },
      timeout: 10000, // 10s timeout
    });

    logger.debug(`Webhook forwarded to ${tenant.webhookUrl}: ${event.type}`);
  } catch (error) {
    logger.warn(`Webhook forwarding failed for tenant ${tenantId}: ${error.message}`);
    // Don't throw — webhook forwarding is best-effort
  }
};

module.exports = { forwardWebhookEvent };
