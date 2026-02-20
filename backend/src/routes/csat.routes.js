const express = require('express');
const router = express.Router();
const csatController = require('../controllers/csat.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

// Survey Config CRUD — admin/customer only
router.post('/surveys', authenticate, authorize('admin', 'customer'), csatController.createSurvey);
router.get('/surveys', authenticate, csatController.getSurveys);
router.put('/surveys/:id', authenticate, authorize('admin', 'customer'), csatController.updateSurvey);
router.delete('/surveys/:id', authenticate, authorize('admin', 'customer'), csatController.deleteSurvey);

// Send survey to customer
router.post('/send', authenticate, csatController.sendSurvey);

// Record a response (can be called from webhook handler too)
router.post('/respond', authenticate, csatController.recordResponse);

// Analytics
router.get('/analytics', authenticate, csatController.getAnalytics);
router.get('/responses', authenticate, csatController.getResponses);

module.exports = router;
