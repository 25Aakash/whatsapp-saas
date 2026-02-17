const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let redisConnection = null;

const getRedisConnection = () => {
  if (!redisConnection) {
    redisConnection = new Redis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connected');
    });

    redisConnection.on('error', (err) => {
      logger.error('Redis error:', err.message);
    });
  }
  return redisConnection;
};

module.exports = { getRedisConnection };
