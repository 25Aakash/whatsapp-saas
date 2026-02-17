const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

// All template routes require authentication
router.use(authenticate);

// List templates
router.get('/', templateController.listTemplates);

// Sync templates from Meta
router.post('/sync', authorize('admin', 'customer'), templateController.syncTemplates);

module.exports = router;
