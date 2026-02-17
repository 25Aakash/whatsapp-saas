const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, sendMessageSchema, sendTemplateSchema } = require('../middlewares/validate.middleware');
const { messageLimiter } = require('../middlewares/rateLimiter.middleware');

// All message routes require authentication
router.use(authenticate);

// Get messages for a conversation
router.get('/:conversationId', messageController.getMessages);

// Send text message
router.post('/send', messageLimiter, validate(sendMessageSchema), messageController.sendMessage);

// Send template message
router.post('/send-template', messageLimiter, validate(sendTemplateSchema), messageController.sendTemplate);

module.exports = router;
