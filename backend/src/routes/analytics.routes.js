const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);

// Analytics
router.get('/dashboard', analyticsController.getDashboard);
router.get('/messages', analyticsController.getMessageVolume);
router.get('/response-time', analyticsController.getResponseTime);
router.get('/agents', analyticsController.getAgentPerformance);
router.get('/usage', analyticsController.getUsage);
router.get('/export/csv', analyticsController.exportCSV);

// Billing / Credits
router.get('/billing', analyticsController.getBilling);
router.post('/billing/credits', authorize('admin'), analyticsController.setCredits);
router.post('/billing/cost-per-message', authorize('admin'), analyticsController.setCostPerMessage);

module.exports = router;
