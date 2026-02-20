const express = require('express');
const router = express.Router();
const ssoController = require('../controllers/sso.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

// Public: Initiate SSO login
router.get('/login', ssoController.initLogin);

// Public: SSO callback (SAML POST or OIDC redirect)
router.post('/callback', ssoController.callback);
router.get('/callback', ssoController.callback);

// Authenticated: Get/update SSO config
router.get('/config', authenticate, authorize('customer', 'admin'), ssoController.getConfig);
router.put('/config', authenticate, authorize('customer', 'admin'), ssoController.updateConfig);

module.exports = router;
