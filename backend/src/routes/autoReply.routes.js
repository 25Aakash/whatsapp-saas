const express = require('express');
const router = express.Router();
const autoReplyController = require('../controllers/autoReply.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(authorize('customer', 'admin'));

router.post('/', autoReplyController.createRule);
router.get('/', autoReplyController.listRules);
router.put('/:id', autoReplyController.updateRule);
router.delete('/:id', autoReplyController.deleteRule);

module.exports = router;
