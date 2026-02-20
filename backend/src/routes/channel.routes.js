const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channel.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(authorize('customer', 'customer_agent', 'admin'));

// List available channels
router.get('/', channelController.listChannels);

// Send message via a specific channel
router.post('/send', channelController.sendMessage);

// Broadcast across multiple channels
router.post('/broadcast', channelController.broadcastMessage);

module.exports = router;
