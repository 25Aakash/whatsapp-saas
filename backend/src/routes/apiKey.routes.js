const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKey.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(authorize('customer', 'admin'));

router.post('/', apiKeyController.createApiKey);
router.get('/', apiKeyController.listApiKeys);
router.put('/:id', apiKeyController.updateApiKey);
router.delete('/:id', apiKeyController.revokeApiKey);

module.exports = router;
