const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authenticateApiKey } = require('../middlewares/apiKey.middleware');

// Support both JWT and API key auth
router.use((req, res, next) => {
  authenticate(req, res, (err) => {
    if (err || !req.user) return authenticateApiKey(req, res, next);
    next();
  });
});

router.post('/', contactController.createContact);
router.get('/', contactController.listContacts);
router.post('/import', contactController.importContacts);
router.get('/:id', contactController.getContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
