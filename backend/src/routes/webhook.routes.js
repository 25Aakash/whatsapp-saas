const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { verifyWebhook } = require('../middlewares/webhook.middleware');

// GET - Webhook verification (Meta sends this during setup)
router.get('/', webhookController.verifyWebhook);

// POST - Receive webhook events (with HMAC signature verification)
router.post('/', verifyWebhook, webhookController.handleWebhook);

module.exports = router;
