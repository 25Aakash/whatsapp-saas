const { getRedisConnection } = require('../config/redis');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Per-tenant rate limiting using Redis sliding window
 * Different from the global IP-based rate limiter — this enforces tenant-level API quotas
 */
const tenantRateLimit = ({ maxPerMinute = 60, maxPerDay = 10000 } = {}) => {
  return async (req, res, next) => {
    const tenantId = req.tenantId;
    if (!tenantId) return next(); // No tenant context, skip

    // Use API key rate limit if present
    const perMinute = req.apiKey?.rateLimit?.maxPerMinute || maxPerMinute;

    try {
      const redis = getRedisConnection();
      const now = Date.now();
      const minuteKey = `rl:tenant:${tenantId}:min`;
      const dayKey = `rl:tenant:${tenantId}:day`;

      // Per-minute check
      const minuteCount = await redis.incr(minuteKey);
      if (minuteCount === 1) {
        await redis.expire(minuteKey, 60);
      }
      if (minuteCount > perMinute) {
        res.set('Retry-After', '60');
        res.set('X-RateLimit-Limit', String(perMinute));
        res.set('X-RateLimit-Remaining', '0');
        return apiResponse(res, 429, 'Tenant rate limit exceeded. Try again in a minute.');
      }

      // Per-day check
      const dayCount = await redis.incr(dayKey);
      if (dayCount === 1) {
        await redis.expire(dayKey, 86400);
      }
      if (dayCount > maxPerDay) {
        res.set('Retry-After', '3600');
        return apiResponse(res, 429, 'Daily API limit exceeded for this tenant.');
      }

      // Set rate limit headers
      res.set('X-RateLimit-Limit', String(perMinute));
      res.set('X-RateLimit-Remaining', String(Math.max(0, perMinute - minuteCount)));

      next();
    } catch (error) {
      // Don't block requests if Redis is down
      logger.warn('Tenant rate limit check failed:', error.message);
      next();
    }
  };
};

module.exports = { tenantRateLimit };
