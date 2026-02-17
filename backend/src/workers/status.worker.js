const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const messageService = require('../services/message.service');
const logger = require('../utils/logger');

let statusWorker = null;
let ioGetter = null;

/**
 * Set Socket.IO getter for emitting real-time events
 */
const setIOGetter = (getter) => {
  ioGetter = getter;
};

/**
 * Process a status update from webhook payload
 */
const processStatusUpdate = async (job) => {
  const { status } = job.data;

  try {
    const waMessageId = status.id;
    const statusValue = status.status; // sent, delivered, read, failed
    const timestamp = status.timestamp;

    // Extract error info if failed
    let errorInfo = null;
    if (statusValue === 'failed' && status.errors?.length > 0) {
      const err = status.errors[0];
      errorInfo = {
        code: err.code,
        title: err.title,
        message: err.message,
      };
    }

    const message = await messageService.updateMessageStatus(
      waMessageId,
      statusValue,
      timestamp,
      errorInfo
    );

    if (message) {
      logger.info(`Status updated: ${waMessageId} -> ${statusValue}`);

      // Emit Socket.IO event
      if (ioGetter) {
        try {
          const io = ioGetter();
          io.to(`tenant:${message.tenant}`).emit('message-status-update', {
            messageId: message._id,
            waMessageId,
            conversationId: message.conversation,
            status: statusValue,
            timestamp,
            errorInfo,
          });
          io.to(`conversation:${message.conversation}`).emit('message-status-update', {
            messageId: message._id,
            waMessageId,
            status: statusValue,
            timestamp,
            errorInfo,
          });
        } catch (socketErr) {
          logger.debug('Socket emit skipped (not initialized)');
        }
      }
    }
  } catch (error) {
    logger.error(`Status worker error:`, error.message);
    throw error;
  }
};

/**
 * Start the status update worker
 */
const startStatusWorker = () => {
  const connection = getRedisConnection();

  statusWorker = new Worker('status-updates', processStatusUpdate, {
    connection,
    concurrency: 10,
    limiter: { max: 100, duration: 1000 },
  });

  statusWorker.on('completed', (job) => {
    logger.debug(`Status job completed: ${job.id}`);
  });

  statusWorker.on('failed', (job, err) => {
    logger.error(`Status job failed: ${job?.id}`, err.message);
  });

  logger.info('Status update worker started');
  return statusWorker;
};

module.exports = { startStatusWorker, setIOGetter };
