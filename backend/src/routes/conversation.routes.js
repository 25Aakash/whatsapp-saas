const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All conversation routes require authentication
router.use(authenticate);

// List conversations
router.get('/', conversationController.listConversations);

// Get conversation by ID
router.get('/:id', conversationController.getConversation);

// Mark conversation as read
router.put('/:id/read', conversationController.markRead);

// Assign agent
router.put('/:id/assign', conversationController.assignAgent);

// Update tags
router.put('/:id/tags', conversationController.updateTags);

// Update notes
router.put('/:id/notes', conversationController.updateNotes);

// Close conversation
router.put('/:id/close', conversationController.closeConversation);

module.exports = router;
