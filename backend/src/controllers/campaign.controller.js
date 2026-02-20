const campaignService = require('../services/campaign.service');
const { apiResponse, paginatedResponse, parsePagination } = require('../utils/helpers');

/**
 * POST /api/v1/campaigns
 */
const createCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.createCampaign(req.tenantId, req.user._id, req.body);
    return apiResponse(res, 201, 'Campaign created', { campaign });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/campaigns
 */
const listCampaigns = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status } = req.query;
    const { campaigns, total } = await campaignService.listCampaigns(req.tenantId, { skip, limit, status });
    return paginatedResponse(res, campaigns, total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/campaigns/:id
 */
const getCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.getCampaignById(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Campaign fetched', { campaign });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/campaigns/:id/launch
 */
const launchCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.launchCampaign(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Campaign launched', { campaign });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/campaigns/:id/cancel
 */
const cancelCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.cancelCampaign(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Campaign cancelled', { campaign });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCampaign, listCampaigns, getCampaign, launchCampaign, cancelCampaign };
