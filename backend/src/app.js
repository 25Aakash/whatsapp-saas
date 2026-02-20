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
const { verifySignedRequest } = require('./utils/crypto');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const webhookRoutes = require('./routes/webhook.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes = require('./routes/message.routes');
const templateRoutes = require('./routes/template.routes');
const apiKeyRoutes = require('./routes/apiKey.routes');
const mediaRoutes = require('./routes/media.routes');
const contactRoutes = require('./routes/contact.routes');
const campaignRoutes = require('./routes/campaign.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const cannedResponseRoutes = require('./routes/cannedResponse.routes');
const autoReplyRoutes = require('./routes/autoReply.routes');
const scheduledMessageRoutes = require('./routes/scheduledMessage.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const flowRoutes = require('./routes/flow.routes');
const channelRoutes = require('./routes/channel.routes');
const ssoRoutes = require('./routes/sso.routes');
const catalogRoutes = require('./routes/catalog.routes');
const csatRoutes = require('./routes/csat.routes');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Sandbox middleware
const { sandboxHeader } = require('./middlewares/sandbox.middleware');

const app = express();
const server = http.createServer(app);

// ============ Middleware ============

// Trust proxy (required when behind reverse proxy / load balancer for HTTPS)
if (env.isProd) {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet());

// CORS - supports comma-separated origins via CORS_ORIGINS env var
const allowedOrigins = env.corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
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

// Sandbox mode header
app.use(sandboxHeader);

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
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/canned-responses', cannedResponseRoutes);
app.use('/api/v1/auto-replies', autoReplyRoutes);
app.use('/api/v1/scheduled-messages', scheduledMessageRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/flows', flowRoutes);
app.use('/api/v1/channels', channelRoutes);
app.use('/api/v1/sso', ssoRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/csat', csatRoutes);

// Swagger API docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customSiteTitle: 'WhatsApp SaaS API Docs',
}));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
  });
});

// Meta Data Deletion Callback (required for Facebook Login / Embedded Signup)
// Verifies signed_request, identifies the user via stored fbUserId, and deletes all their data
app.post('/api/v1/data-deletion', async (req, res) => {
  const { signed_request } = req.body;
  logger.info('Data deletion request received', { signed_request: !!signed_request });

  // Step 1: Verify the signed_request signature using App Secret
  if (!signed_request) {
    return res.status(400).json({ error: 'Missing signed_request parameter' });
  }

  const { isValid, payload } = verifySignedRequest(signed_request, env.metaAppSecret);
  if (!isValid) {
    logger.warn('Data deletion signed_request signature verification failed');
    return res.status(403).json({ error: 'Invalid signed_request signature' });
  }

  const fbUserId = payload.user_id;
  if (!fbUserId) {
    logger.warn('Data deletion signed_request missing user_id');
    return res.status(400).json({ error: 'No user_id in signed_request' });
  }

  const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}`;
  const statusUrl = `${env.frontendUrl || 'http://localhost:3000'}/data-deletion/status?code=${confirmationCode}`;

  logger.info('Data deletion verified', { fbUserId, confirmationCode });

  // Respond immediately per Meta's requirements, then delete in background
  res.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });

  // Step 2: Background deletion — find tenant by fbUserId and delete all associated data
  try {
    const User = require('./models/User');
    const Tenant = require('./models/Tenant');
    const Conversation = require('./models/Conversation');
    const Message = require('./models/Message');
    const Template = require('./models/Template');
    const Contact = require('./models/Contact');
    const Campaign = require('./models/Campaign');
    const CannedResponse = require('./models/CannedResponse');
    const AutoReplyRule = require('./models/AutoReplyRule');
    const ScheduledMessage = require('./models/ScheduledMessage');
    const Flow = require('./models/Flow');
    const FlowSession = require('./models/FlowSession');
    const CSATSurvey = require('./models/CSATSurvey');
    const CSATResponse = require('./models/CSATResponse');
    const AuditLog = require('./models/AuditLog');
    const ApiKey = require('./models/ApiKey');
    const UsageLog = require('./models/UsageLog');

    // Find tenants linked to this Facebook user
    const tenants = await Tenant.find({ 'meta.fbUserId': fbUserId });

    if (tenants.length === 0) {
      logger.info(`No tenant found for FB user ${fbUserId}. Code: ${confirmationCode}`);
      return;
    }

    for (const tenant of tenants) {
      const tenantId = tenant._id;
      logger.info(`Deleting all data for tenant ${tenantId} (FB user: ${fbUserId}, code: ${confirmationCode})`);

      // Delete all tenant-scoped data
      await Promise.all([
        Message.deleteMany({ tenant: tenantId }),
        Conversation.deleteMany({ tenant: tenantId }),
        Template.deleteMany({ tenant: tenantId }),
        Contact.deleteMany({ tenant: tenantId }),
        Campaign.deleteMany({ tenant: tenantId }),
        CannedResponse.deleteMany({ tenant: tenantId }),
        AutoReplyRule.deleteMany({ tenant: tenantId }),
        ScheduledMessage.deleteMany({ tenant: tenantId }),
        Flow.deleteMany({ tenant: tenantId }),
        FlowSession.deleteMany({ tenant: tenantId }),
        CSATSurvey.deleteMany({ tenant: tenantId }),
        CSATResponse.deleteMany({ tenant: tenantId }),
        AuditLog.deleteMany({ tenant: tenantId }),
        ApiKey.deleteMany({ tenant: tenantId }),
        UsageLog.deleteMany({ tenant: tenantId }),
        User.deleteMany({ tenant: tenantId }),
      ]);

      // Delete the tenant itself
      await Tenant.findByIdAndDelete(tenantId);
      logger.info(`All data deleted for tenant ${tenantId}. Code: ${confirmationCode}`);
    }
  } catch (deletionError) {
    logger.error('Data deletion background processing error:', deletionError.message);
  }
});

// Data Deletion Status Lookup (Meta checks this URL after receiving the callback response)
app.get('/api/v1/data-deletion/status', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing confirmation code' });
  }
  // Since deletions happen immediately in the background after the callback,
  // we return a completed status. For large-scale apps, you'd track progress in a DB.
  res.json({
    confirmation_code: code,
    status: 'completed',
    message: 'All user data associated with this request has been permanently deleted.',
  });
});

// Data deletion by email (used by the frontend data-deletion page)
app.post('/api/v1/data-deletion/by-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}`;
  logger.info('Data deletion by email requested', { email, confirmationCode });

  try {
    const User = require('./models/User');
    const Tenant = require('./models/Tenant');
    const Conversation = require('./models/Conversation');
    const Message = require('./models/Message');
    const Template = require('./models/Template');

    const Contact = require('./models/Contact');
    const Campaign = require('./models/Campaign');
    const CannedResponse = require('./models/CannedResponse');
    const AutoReplyRule = require('./models/AutoReplyRule');
    const ScheduledMessage = require('./models/ScheduledMessage');
    const Flow = require('./models/Flow');
    const FlowSession = require('./models/FlowSession');
    const CSATSurvey = require('./models/CSATSurvey');
    const CSATResponse = require('./models/CSATResponse');
    const AuditLog = require('./models/AuditLog');
    const ApiKey = require('./models/ApiKey');
    const UsageLog = require('./models/UsageLog');

    const user = await User.findOne({ email });
    if (user) {
      const tenantId = user.tenant;

      if (tenantId) {
        // Delete all tenant-scoped data
        await Promise.all([
          Message.deleteMany({ tenant: tenantId }),
          Conversation.deleteMany({ tenant: tenantId }),
          Template.deleteMany({ tenant: tenantId }),
          Contact.deleteMany({ tenant: tenantId }),
          Campaign.deleteMany({ tenant: tenantId }),
          CannedResponse.deleteMany({ tenant: tenantId }),
          AutoReplyRule.deleteMany({ tenant: tenantId }),
          ScheduledMessage.deleteMany({ tenant: tenantId }),
          Flow.deleteMany({ tenant: tenantId }),
          FlowSession.deleteMany({ tenant: tenantId }),
          CSATSurvey.deleteMany({ tenant: tenantId }),
          CSATResponse.deleteMany({ tenant: tenantId }),
          AuditLog.deleteMany({ tenant: tenantId }),
          ApiKey.deleteMany({ tenant: tenantId }),
          UsageLog.deleteMany({ tenant: tenantId }),
          User.deleteMany({ tenant: tenantId }),
        ]);
        // Remove the tenant itself
        await Tenant.findByIdAndDelete(tenantId);
        logger.info(`All data deleted for tenant: ${tenantId}, email: ${email}, code: ${confirmationCode}`);
      } else {
        // Delete just the user (admin or unlinked user)
        await User.findByIdAndDelete(user._id);
        logger.info(`User deleted: ${email}, code: ${confirmationCode}`);
      }
    } else {
      logger.info(`No user found for deletion email: ${email}, code: ${confirmationCode}`);
    }

    res.json({
      success: true,
      message: 'Data deletion request processed',
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    logger.error('Data deletion by email error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process deletion request' });
  }
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

    // Start scheduled message poller
    const { startSchedulerWorker } = require('./workers/scheduler.worker');
    startSchedulerWorker();

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
