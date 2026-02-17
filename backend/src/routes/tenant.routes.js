const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate, createTenantSchema, embeddedSignupSchema } = require('../middlewares/validate.middleware');

// All tenant routes require authentication
router.use(authenticate);

// Customer: get own account details
router.get(
  '/my-account',
  authorize('customer', 'customer_agent'),
  tenantController.getMyAccount
);

// Customer: Embedded Signup (connect WhatsApp)
router.post(
  '/embedded-signup',
  authorize('customer'),
  validate(embeddedSignupSchema),
  tenantController.embeddedSignup
);

// Customer: check own health
router.get(
  '/my-account/status',
  authorize('customer', 'customer_agent'),
  tenantController.checkMyStatus
);

// Admin: list all tenants/customers
router.get('/', authorize('admin'), tenantController.listTenants);

// Admin: create tenant manually
router.post(
  '/',
  authorize('admin'),
  validate(createTenantSchema),
  tenantController.createTenant
);

// Admin: get tenant by ID
router.get('/:id', authorize('admin'), tenantController.getTenant);

// Admin: check tenant health
router.get('/:id/status', authorize('admin'), tenantController.checkStatus);

// Admin: update tenant
router.put('/:id', authorize('admin'), tenantController.updateTenant);

// Admin: deactivate tenant
router.delete('/:id', authorize('admin'), tenantController.deleteTenant);

module.exports = router;
