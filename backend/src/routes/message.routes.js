const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authenticateApiKey } = require('../middlewares/apiKey.middleware');
const { validate, sendMessageSchema, sendTemplateSchema } = require('../middlewares/validate.middleware');
const { messageLimiter } = require('../middlewares/rateLimiter.middleware');

// Support both JWT and API key auth
router.use((req, res, next) => {
  authenticate(req, res, (err) => {
    if (err || !req.user) return authenticateApiKey(req, res, next);
    next();
  });
});

// Get messages for a conversation
router.get('/:conversationId', messageController.getMessages);

// Send text message
router.post('/send', messageLimiter, validate(sendMessageSchema), messageController.sendMessage);

// Send template message
router.post('/send-template', messageLimiter, validate(sendTemplateSchema), messageController.sendTemplate);

// Send media message (image, video, audio, document, sticker)
router.post('/send-media', messageLimiter, messageController.sendMediaMessage);

// Send interactive message (buttons, list)
router.post('/send-interactive', messageLimiter, messageController.sendInteractive);

// Send location message
router.post('/send-location', messageLimiter, messageController.sendLocation);

// Send reaction
router.post('/send-reaction', messageLimiter, messageController.sendReaction);

module.exports = router;
