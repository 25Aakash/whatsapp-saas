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

module.exports = {
  validate,
  loginSchema,
  customerRegisterSchema,
  registerSchema,
  sendMessageSchema,
  sendTemplateSchema,
  createTenantSchema,
  embeddedSignupSchema,
};
