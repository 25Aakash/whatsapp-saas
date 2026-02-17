const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { validate, loginSchema, customerRegisterSchema, registerSchema } = require('../middlewares/validate.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

// Public routes
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Public customer self-registration
router.post('/customer-register', authLimiter, validate(customerRegisterSchema), authController.customerRegister);

// Get current user profile
router.get('/me', authenticate, authController.getMe);

// Admin creates users OR customer invites team members
router.post(
  '/register',
  authenticate,
  authorize('admin', 'customer'),
  validate(registerSchema),
  authController.register
);

// Get team members (customer sees own team, admin sees all)
router.get('/team', authenticate, authorize('admin', 'customer'), authController.getTeamMembers);

// Remove a team member
router.delete('/team/:id', authenticate, authorize('admin', 'customer'), authController.removeTeamMember);

module.exports = router;
