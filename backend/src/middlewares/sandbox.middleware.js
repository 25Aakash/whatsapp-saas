const env = require('../config/env');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Sandbox middleware — intercepts WhatsApp API calls and returns mock responses
 * when SANDBOX_MODE=true, so developers can test without real API credentials.
 *
 * Attach to the whatsappService functions or as express middleware for test endpoints.
 */

const SANDBOX_PHONE = '15551234567';

/**
 * Generate a mock WhatsApp message ID
 */
const mockWaMessageId = () => `wamid.mock_${crypto.randomBytes(12).toString('hex')}`;

/**
 * Mock responses for different WhatsApp API calls
 */
const mockResponses = {
  sendText: (to, body) => ({
    waMessageId: mockWaMessageId(),
    to,
    type: 'text',
    body,
    sandbox: true,
  }),
  sendTemplate: (to, templateName) => ({
    waMessageId: mockWaMessageId(),
    to,
    templateName,
    type: 'template',
    sandbox: true,
  }),
  sendMedia: (to, mediaType) => ({
    waMessageId: mockWaMessageId(),
    to,
    type: mediaType,
    sandbox: true,
  }),
  sendInteractive: (to) => ({
    waMessageId: mockWaMessageId(),
    to,
    type: 'interactive',
    sandbox: true,
  }),
  uploadMedia: () => ({
    mediaId: `mock_media_${crypto.randomBytes(8).toString('hex')}`,
    sandbox: true,
  }),
};

/**
 * Check if sandbox mode is active
 */
const isSandboxMode = () => env.sandboxMode === true;

/**
 * Express middleware that adds sandbox info header
 */
const sandboxHeader = (req, res, next) => {
  if (isSandboxMode()) {
    res.set('X-Sandbox-Mode', 'true');
  }
  next();
};

/**
 * Wrap a WhatsApp service function to return mocks in sandbox mode
 */
const wrapService = (serviceFn, mockFn) => {
  return async (...args) => {
    if (isSandboxMode()) {
      logger.debug(`[SANDBOX] Mocking WhatsApp API call: ${serviceFn.name || 'anonymous'}`);
      const result = mockFn(...args);
      // Simulate small network delay
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
      return result;
    }
    return serviceFn(...args);
  };
};

module.exports = {
  isSandboxMode,
  sandboxHeader,
  wrapService,
  mockResponses,
  mockWaMessageId,
  SANDBOX_PHONE,
};
