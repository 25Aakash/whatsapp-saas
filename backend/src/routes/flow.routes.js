const express = require('express');
const router = express.Router();
const flowController = require('../controllers/flow.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

// All routes require authentication and customer/admin access
router.use(authenticate);
router.use(authorize('customer', 'customer_agent', 'admin'));

router.get('/', flowController.getFlows);
router.post('/', authorize('customer', 'admin'), flowController.createFlow);
router.get('/:id', flowController.getFlow);
router.put('/:id', authorize('customer', 'admin'), flowController.updateFlow);
router.delete('/:id', authorize('customer', 'admin'), flowController.deleteFlow);
router.post('/:id/activate', authorize('customer', 'admin'), flowController.activateFlow);
router.post('/:id/pause', authorize('customer', 'admin'), flowController.pauseFlow);
router.get('/:id/sessions', flowController.getFlowSessions);

module.exports = router;
