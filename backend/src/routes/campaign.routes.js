const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(authorize('customer', 'admin'));

router.post('/', campaignController.createCampaign);
router.get('/', campaignController.listCampaigns);
router.get('/:id', campaignController.getCampaign);
router.post('/:id/launch', campaignController.launchCampaign);
router.post('/:id/cancel', campaignController.cancelCampaign);

module.exports = router;
