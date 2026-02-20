const UsageLog = require('../models/UsageLog');
const logger = require('../utils/logger');

/**
 * Usage tracking middleware
 * Increments API call counter for the tenant
 */
const trackUsage = (req, res, next) => {
  const tenantId = req.tenantId;
  if (!tenantId) return next();

  // Track asynchronously — don't delay the request
  const endpoint = `${req.method} ${req.baseUrl}${req.route?.path || req.path}`;

  res.on('finish', () => {
    if (res.statusCode < 400) {
      UsageLog.increment(tenantId, 'apiCalls.total').catch((err) => {
        logger.debug('Usage tracking error:', err.message);
      });
    }
  });

  next();
};

/**
 * Track message usage
 */
const trackMessageUsage = async (tenantId, direction, type) => {
  try {
    const fields = { 'messages.total': 1 };
    if (direction === 'inbound') fields['messages.inbound'] = 1;
    if (direction === 'outbound') fields['messages.outbound'] = 1;
    if (type === 'template') fields['messages.template'] = 1;
    if (['image', 'video', 'audio', 'document'].includes(type)) fields['messages.media'] = 1;

    const period = new Date().toISOString().slice(0, 7);
    await UsageLog.findOneAndUpdate(
      { tenant: tenantId, period },
      { $inc: fields },
      { upsert: true }
    );
  } catch (err) {
    logger.debug('Message usage tracking error:', err.message);
  }
};

module.exports = { trackUsage, trackMessageUsage };
