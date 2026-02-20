const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

let inboundQueue = null;
let statusQueue = null;
let outboundQueue = null;
let campaignQueue = null;

const getQueues = () => {
  const connection = getRedisConnection();

  if (!inboundQueue) {
    inboundQueue = new Queue('inbound-messages', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }

  if (!statusQueue) {
    statusQueue = new Queue('status-updates', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }

  if (!outboundQueue) {
    outboundQueue = new Queue('outbound-messages', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }

  if (!campaignQueue) {
    campaignQueue = new Queue('campaigns', {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
  }

  return { inboundQueue, statusQueue, outboundQueue, campaignQueue };
};

module.exports = { getQueues };
