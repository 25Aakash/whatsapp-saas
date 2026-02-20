const { z } = require('zod');
const { apiResponse } = require('../utils/helpers');

/**
 * Validation middleware using Zod schemas
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Request property to validate
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return apiResponse(res, 400, 'Validation failed', { errors });
      }
      // Replace with parsed/cleaned data
      req[source] = result.data;
      next();
    } catch (error) {
      return apiResponse(res, 500, 'Validation error');
    }
  };
};

// ============ Validation Schemas ============

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Public customer self-registration
const customerRegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  businessName: z.string().min(1, 'Business name is required').max(100),
});

// Admin creating users or customer inviting team members
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['admin', 'customer', 'customer_agent']).optional(),
  tenantId: z.string().optional(),
});

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  body: z.string().min(1, 'Message body is required').max(4096),
  type: z.enum(['text']).optional().default('text'),
});

const sendTemplateSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  templateName: z.string().min(1, 'Template name is required'),
  language: z.string().min(1, 'Language code is required'),
  components: z.array(z.any()).optional().default([]),
});

const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100),
});

const embeddedSignupSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

// ============ New Feature Schemas ============

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  allowedIps: z.array(z.string()).optional(),
});

const createContactSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  name: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  templateName: z.string().min(1, 'Template name is required'),
  templateLanguage: z.string().min(1, 'Template language is required'),
  templateComponents: z.array(z.any()).optional(),
  audience: z.object({
    type: z.enum(['all', 'tags', 'groups', 'contacts']).optional(),
    tags: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional(),
    contactIds: z.array(z.string()).optional(),
  }).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  phoneNumberId: z.string().optional(),
});

const createCannedResponseSchema = z.object({
  shortcode: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(4096),
  category: z.string().max(50).optional(),
  variables: z.array(z.string()).optional(),
});

const createAutoReplySchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.object({
    type: z.enum(['keyword', 'regex', 'first_message', 'out_of_hours', 'all']),
    value: z.string().optional(),
    caseSensitive: z.boolean().optional(),
  }),
  action: z.object({
    type: z.enum(['text_reply', 'template_reply', 'assign_agent', 'add_tag']),
    message: z.string().optional(),
    templateName: z.string().optional(),
    templateLanguage: z.string().optional(),
    agentId: z.string().optional(),
    tag: z.string().optional(),
  }),
  priority: z.number().min(1).max(100).optional(),
  cooldownMinutes: z.number().min(0).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(512)
    .regex(/^[a-z0-9_]+$/, 'Template name must be lowercase alphanumeric with underscores'),
  language: z.string().min(2, 'Language code is required'),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  components: z.array(z.any()).optional(),
});

module.exports = {
  validate,
  loginSchema,
  customerRegisterSchema,
  registerSchema,
  sendMessageSchema,
  sendTemplateSchema,
  createTenantSchema,
  embeddedSignupSchema,
  createApiKeySchema,
  createContactSchema,
  createCampaignSchema,
  createCannedResponseSchema,
  createAutoReplySchema,
  createTemplateSchema,
};
