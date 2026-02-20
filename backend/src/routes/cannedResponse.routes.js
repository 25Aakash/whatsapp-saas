const express = require('express');
const router = express.Router();
const cannedResponseController = require('../controllers/cannedResponse.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.post('/', cannedResponseController.createCannedResponse);
router.get('/', cannedResponseController.listCannedResponses);
router.put('/:id', cannedResponseController.updateCannedResponse);
router.delete('/:id', cannedResponseController.deleteCannedResponse);

module.exports = router;
