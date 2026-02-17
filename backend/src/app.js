const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');

const env = require('./config/env');
const connectDB = require('./config/db');
const { initSocket, getIO } = require('./config/socket');
const { startWorkers } = require('./workers');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const webhookRoutes = require('./routes/webhook.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes = require('./routes/message.routes');
const templateRoutes = require('./routes/template.routes');

const app = express();
const server = http.createServer(app);

// ============ Middleware ============

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// HPP - HTTP Parameter Pollution protection
app.use(hpp());

// Request logging
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing - IMPORTANT: webhook needs raw body for signature verification
app.use('/api/v1/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// Standard JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (skip for webhooks)
app.use('/api/v1', (req, res, next) => {
  if (req.path.startsWith('/webhook')) return next();
  return apiLimiter(req, res, next);
});

// ============ Routes (v1) ============

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/webhook', webhookRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/templates', templateRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
  });
});

// Meta Data Deletion Callback (required for Facebook Login)
app.post('/api/v1/data-deletion', (req, res) => {
  const { signed_request } = req.body;
  logger.info('Data deletion request received', { signed_request: !!signed_request });

  const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}`;
  const url = `${env.frontendUrl || 'http://localhost:3000'}/data-deletion`;

  res.json({
    url: url,
    confirmation_code: confirmationCode,
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============ Start Server ============

const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Socket.IO
    initSocket(server);

    // Start BullMQ workers (in-process for simplicity)
    await startWorkers(() => getIO());

    // Start HTTP server
    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} (${env.nodeEnv})`);
      logger.info(`Frontend URL: ${env.frontendUrl}`);
      logger.info(`Health check: http://localhost:${env.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});

start();

module.exports = app;
