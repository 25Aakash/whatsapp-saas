const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'WhatsApp SaaS Platform API',
    version: '1.0.0',
    description:
      'Multi-tenant WhatsApp Cloud API SaaS platform. Comparable to Gupshup, Twilio and similar providers. Supports messaging, templates, campaigns, contacts, analytics, billing, and more.',
    contact: { name: 'API Support' },
    license: { name: 'Proprietary' },
  },
  servers: [
    {
      url: `http://localhost:${env.port}/api/v1`,
      description: 'Local development',
    },
    {
      url: '{baseUrl}/api/v1',
      description: 'Production',
      variables: { baseUrl: { default: 'https://api.yourdomain.com' } },
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          totalPages: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      // ---- Auth ----
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name', 'businessName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
          businessName: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'customer', 'customer_agent'] },
                },
              },
            },
          },
        },
      },
      // ---- Message ----
      SendTextMessage: {
        type: 'object',
        required: ['to', 'text'],
        properties: {
          to: { type: 'string', description: 'Recipient phone number (E.164)' },
          text: { type: 'string' },
        },
      },
      SendTemplateMessage: {
        type: 'object',
        required: ['to', 'templateName', 'languageCode'],
        properties: {
          to: { type: 'string' },
          templateName: { type: 'string' },
          languageCode: { type: 'string', default: 'en_US' },
          components: { type: 'array', items: { type: 'object' } },
        },
      },
      // ---- Conversation ----
      Conversation: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          tenant: { type: 'string' },
          contactPhone: { type: 'string' },
          contactName: { type: 'string' },
          phoneNumberId: { type: 'string' },
          lastMessage: { type: 'object' },
          status: { type: 'string', enum: ['open', 'closed'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      // ---- Contact ----
      Contact: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          phone: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          customFields: { type: 'object' },
        },
      },
      // ---- Campaign ----
      Campaign: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          templateName: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'] },
          stats: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              sent: { type: 'integer' },
              delivered: { type: 'integer' },
              read: { type: 'integer' },
              failed: { type: 'integer' },
            },
          },
        },
      },
      // ---- Template ----
      Template: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          language: { type: 'string' },
          category: { type: 'string' },
          status: { type: 'string' },
          components: { type: 'array', items: { type: 'object' } },
        },
      },
      // ---- Analytics ----
      DashboardStats: {
        type: 'object',
        properties: {
          conversations: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              open: { type: 'integer' },
            },
          },
          messages: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              inbound: { type: 'integer' },
              outbound: { type: 'integer' },
            },
          },
          contacts: { type: 'integer' },
        },
      },
      // ---- Billing ----
      BillingOverview: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          limits: { type: 'object' },
          currentUsage: { type: 'object' },
          billing: { type: 'object' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication & user management' },
    { name: 'Messages', description: 'Send & receive WhatsApp messages' },
    { name: 'Conversations', description: 'Conversation management' },
    { name: 'Templates', description: 'WhatsApp message templates' },
    { name: 'Contacts', description: 'Contact management' },
    { name: 'Campaigns', description: 'Bulk messaging campaigns' },
    { name: 'Media', description: 'Media upload/download' },
    { name: 'Analytics', description: 'Dashboard, usage & reporting' },
    { name: 'Billing', description: 'Credits & usage management' },
    { name: 'API Keys', description: 'API key management' },
    { name: 'Auto Replies', description: 'Automated reply rules' },
    { name: 'Canned Responses', description: 'Pre-built quick replies' },
    { name: 'Webhooks', description: 'WhatsApp Cloud API webhook' },
    { name: 'Tenants', description: 'Tenant / WABA management' },
    { name: 'Audit Logs', description: 'Activity audit trail' },
    { name: 'Scheduled Messages', description: 'Message scheduling' },
  ],
  paths: {
    // ===== Auth =====
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { 200: { description: 'JWT token + user object', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } } },
      },
    },
    '/auth/customer-register': {
      post: {
        tags: ['Auth'],
        summary: 'Customer self-registration',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 201: { description: 'Account created' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get current user profile', responses: { 200: { description: 'User profile' } } },
    },
    '/auth/register': {
      post: { tags: ['Auth'], summary: 'Admin/customer invite team member', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' } } } } } }, responses: { 201: { description: 'User created' } } },
    },
    '/auth/team': {
      get: { tags: ['Auth'], summary: 'List team members', responses: { 200: { description: 'Array of team members' } } },
    },
    '/auth/team/{id}': {
      delete: { tags: ['Auth'], summary: 'Remove team member', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Member removed' } } },
    },
    '/auth/2fa/enable': {
      post: { tags: ['Auth'], summary: 'Enable 2FA (TOTP)', responses: { 200: { description: 'QR code URL + secret' } } },
    },
    '/auth/2fa/verify': {
      post: { tags: ['Auth'], summary: 'Verify 2FA token', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } } }, responses: { 200: { description: '2FA enabled' } } },
    },

    // ===== Messages =====
    '/messages/{conversationId}': {
      get: { tags: ['Messages'], summary: 'Get messages in a conversation', parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Array of messages' } } },
    },
    '/messages/{conversationId}/send': {
      post: { tags: ['Messages'], summary: 'Send a text message', parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendTextMessage' } } } }, responses: { 200: { description: 'Message sent' } } },
    },
    '/messages/{conversationId}/send-template': {
      post: { tags: ['Messages'], summary: 'Send a template message', parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendTemplateMessage' } } } }, responses: { 200: { description: 'Template sent' } } },
    },
    '/messages/{conversationId}/send-media': {
      post: { tags: ['Messages'], summary: 'Send a media message (image/video/audio/document)', parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Media message sent' } } },
    },

    // ===== Conversations =====
    '/conversations': {
      get: { tags: ['Conversations'], summary: 'List conversations', parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Array of conversations' } } },
    },
    '/conversations/{id}': {
      get: { tags: ['Conversations'], summary: 'Get conversation details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Conversation object' } } },
    },

    // ===== Templates =====
    '/templates': {
      get: { tags: ['Templates'], summary: 'List templates', responses: { 200: { description: 'Array of templates' } } },
      post: { tags: ['Templates'], summary: 'Create template on WhatsApp', responses: { 201: { description: 'Template created' } } },
    },
    '/templates/sync': {
      post: { tags: ['Templates'], summary: 'Sync templates from WhatsApp', responses: { 200: { description: 'Templates synced' } } },
    },

    // ===== Contacts =====
    '/contacts': {
      get: { tags: ['Contacts'], summary: 'List contacts', responses: { 200: { description: 'Paginated contacts' } } },
      post: { tags: ['Contacts'], summary: 'Create a contact', responses: { 201: { description: 'Contact created' } } },
    },
    '/contacts/{id}': {
      get: { tags: ['Contacts'], summary: 'Get contact', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Contact' } } },
      put: { tags: ['Contacts'], summary: 'Update contact', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Contacts'], summary: 'Delete contact', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    // ===== Campaigns =====
    '/campaigns': {
      get: { tags: ['Campaigns'], summary: 'List campaigns', responses: { 200: { description: 'Array of campaigns' } } },
      post: { tags: ['Campaigns'], summary: 'Create campaign', responses: { 201: { description: 'Campaign created' } } },
    },
    '/campaigns/{id}': {
      get: { tags: ['Campaigns'], summary: 'Get campaign details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Campaign' } } },
    },
    '/campaigns/{id}/send': {
      post: { tags: ['Campaigns'], summary: 'Start sending a campaign', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Campaign queued' } } },
    },

    // ===== Analytics =====
    '/analytics/dashboard': {
      get: { tags: ['Analytics'], summary: 'Dashboard stats', responses: { 200: { description: 'Dashboard statistics', content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } } } } },
    },
    '/analytics/messages': {
      get: { tags: ['Analytics'], summary: 'Message volume over time', parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['hour', 'day', 'week', 'month'] } }, { name: 'days', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Volume data' } } },
    },
    '/analytics/export/csv': {
      get: { tags: ['Analytics'], summary: 'Export analytics data as CSV', parameters: [{ name: 'type', in: 'query', schema: { type: 'string', enum: ['messages', 'conversations', 'contacts'] } }], responses: { 200: { description: 'CSV file download' } } },
    },
    '/analytics/usage': {
      get: { tags: ['Analytics'], summary: 'Usage stats', responses: { 200: { description: 'Usage data' } } },
    },

    // ===== Billing / Credits =====
    '/analytics/billing': {
      get: { tags: ['Billing'], summary: 'Get credits & usage overview', responses: { 200: { description: 'Credits balance & usage info' } } },
    },
    '/analytics/billing/credits': {
      post: { tags: ['Billing'], summary: 'Admin: add or set credits for a tenant', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tenantId: { type: 'string' }, credits: { type: 'number' }, mode: { type: 'string', enum: ['add', 'set'] } }, required: ['tenantId', 'credits'] } } } }, responses: { 200: { description: 'Credits updated' } } },
    },
    '/analytics/billing/cost-per-message': {
      post: { tags: ['Billing'], summary: 'Admin: set cost per message for a tenant', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tenantId: { type: 'string' }, cost: { type: 'number' } }, required: ['tenantId', 'cost'] } } } }, responses: { 200: { description: 'Cost updated' } } },
    },

    // ===== API Keys =====
    '/api-keys': {
      get: { tags: ['API Keys'], summary: 'List API keys', responses: { 200: { description: 'Array of keys' } } },
      post: { tags: ['API Keys'], summary: 'Create API key', responses: { 201: { description: 'API key (shown only once)' } } },
    },

    // ===== Auto Replies =====
    '/auto-replies': {
      get: { tags: ['Auto Replies'], summary: 'List auto-reply rules', responses: { 200: { description: 'Array of rules' } } },
      post: { tags: ['Auto Replies'], summary: 'Create auto-reply rule', responses: { 201: { description: 'Rule created' } } },
    },

    // ===== Canned Responses =====
    '/canned-responses': {
      get: { tags: ['Canned Responses'], summary: 'List canned responses', responses: { 200: { description: 'Array of responses' } } },
      post: { tags: ['Canned Responses'], summary: 'Create canned response', responses: { 201: { description: 'Response created' } } },
    },

    // ===== Media =====
    '/media/upload': {
      post: { tags: ['Media'], summary: 'Upload media file', responses: { 200: { description: 'Media ID + URL' } } },
    },
    '/media/{mediaId}': {
      get: { tags: ['Media'], summary: 'Download media', parameters: [{ name: 'mediaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Media binary' } } },
    },

    // ===== Tenants =====
    '/tenants': {
      get: { tags: ['Tenants'], summary: 'List tenants (admin)', responses: { 200: { description: 'Array of tenants' } } },
    },
    '/tenants/complete-signup': {
      post: { tags: ['Tenants'], summary: 'Complete Meta Embedded Signup', responses: { 200: { description: 'WABA connected' } } },
    },

    // ===== Webhook =====
    '/webhook': {
      get: { tags: ['Webhooks'], summary: 'WhatsApp webhook verification (GET)', security: [], responses: { 200: { description: 'Challenge token' } } },
      post: { tags: ['Webhooks'], summary: 'WhatsApp webhook (POST)', security: [], responses: { 200: { description: 'Acknowledged' } } },
    },

    // ===== Audit Logs =====
    '/audit-logs': {
      get: { tags: ['Audit Logs'], summary: 'Get audit logs', parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'action', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Paginated audit entries' } } },
    },

    // ===== Scheduled Messages =====
    '/scheduled-messages': {
      get: { tags: ['Scheduled Messages'], summary: 'List scheduled messages', responses: { 200: { description: 'Array of scheduled messages' } } },
      post: { tags: ['Scheduled Messages'], summary: 'Schedule a message', responses: { 201: { description: 'Message scheduled' } } },
    },
    '/scheduled-messages/{id}/cancel': {
      post: { tags: ['Scheduled Messages'], summary: 'Cancel a scheduled message', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Cancelled' } } },
    },
  },
};

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: [], // We defined paths inline above
});

module.exports = specs;
