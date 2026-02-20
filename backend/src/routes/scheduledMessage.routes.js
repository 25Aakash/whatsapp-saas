const express = require('express');
const router = express.Router();
const scheduledMessageController = require('../controllers/scheduledMessage.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(authorize('admin', 'customer', 'customer_agent'));

router.get('/', scheduledMessageController.listScheduled);
router.post('/', scheduledMessageController.scheduleMessage);
router.post('/:id/cancel', scheduledMessageController.cancelScheduled);

module.exports = router;
