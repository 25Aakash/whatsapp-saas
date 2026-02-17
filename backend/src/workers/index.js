/**
 * Worker process entry point
 * Run separately: npm run worker
 */
const connectDB = require('../config/db');
const { getRedisConnection } = require('../config/redis');
const { startInboundWorker, setIOGetter: setInboundIO } = require('./inbound.worker');
const { startStatusWorker, setIOGetter: setStatusIO } = require('./status.worker');
const { startOutboundWorker } = require('./outbound.worker');
const logger = require('../utils/logger');

const startWorkers = async (ioGetter = null) => {
  // Connect to database
  await connectDB();

  // Ensure Redis is connected
  getRedisConnection();

  // Set Socket.IO getter for workers that need it
  if (ioGetter) {
    setInboundIO(ioGetter);
    setStatusIO(ioGetter);
  }

  // Start all workers
  const inbound = startInboundWorker();
  const status = startStatusWorker();
  const outbound = startOutboundWorker();

  logger.info('All workers started successfully');

  return { inbound, status, outbound };
};

// If running as standalone process
if (require.main === module) {
  startWorkers()
    .then(() => {
      logger.info('Worker process running...');
    })
    .catch((err) => {
      logger.error('Failed to start workers:', err);
      process.exit(1);
    });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { startWorkers };
