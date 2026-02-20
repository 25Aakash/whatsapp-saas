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

// Create template on Meta
router.post('/', authorize('admin', 'customer'), templateController.createTemplate);

// Update template on Meta
router.put('/:id', authorize('admin', 'customer'), templateController.updateTemplate);

// Delete template from Meta
router.delete('/:id', authorize('admin', 'customer'), templateController.deleteTemplate);

module.exports = router;
