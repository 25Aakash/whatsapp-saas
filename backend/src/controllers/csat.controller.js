const csatService = require('../services/csat.service');
const { catchAsync } = require('../middlewares/error.middleware');

// ============ Survey Config CRUD ============

const createSurvey = catchAsync(async (req, res) => {
  const survey = await csatService.createSurvey(req.user.tenant, req.body);
  res.status(201).json({ success: true, data: survey });
});

const getSurveys = catchAsync(async (req, res) => {
  const surveys = await csatService.getSurveys(req.user.tenant);
  res.json({ success: true, data: surveys });
});

const updateSurvey = catchAsync(async (req, res) => {
  const survey = await csatService.updateSurvey(req.user.tenant, req.params.id, req.body);
  res.json({ success: true, data: survey });
});

const deleteSurvey = catchAsync(async (req, res) => {
  await csatService.deleteSurvey(req.user.tenant, req.params.id);
  res.json({ success: true, message: 'Survey deleted' });
});

// ============ Send Survey ============

const sendSurvey = catchAsync(async (req, res) => {
  const { customerPhone, conversationId, surveyId, phoneNumberId } = req.body;
  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;
  const pnId = phoneNumberId || tenant?.phoneNumberId;

  const result = await csatService.sendSurvey(tenantId, pnId, customerPhone, conversationId, surveyId);
  res.json({ success: true, data: result });
});

// ============ Record Response ============

const recordResponse = catchAsync(async (req, res) => {
  const response = await csatService.recordResponse(req.user.tenant, req.body);
  res.status(201).json({ success: true, data: response });
});

// ============ Analytics ============

const getAnalytics = catchAsync(async (req, res) => {
  const { startDate, endDate, agentId } = req.query;
  const analytics = await csatService.getAnalytics(req.user.tenant, { startDate, endDate, agentId });
  res.json({ success: true, data: analytics });
});

const getResponses = catchAsync(async (req, res) => {
  const { page, limit, category } = req.query;
  const result = await csatService.getResponses(req.user.tenant, { page: +page, limit: +limit, category });
  res.json({ success: true, ...result });
});

module.exports = {
  createSurvey,
  getSurveys,
  updateSurvey,
  deleteSurvey,
  sendSurvey,
  recordResponse,
  getAnalytics,
  getResponses,
};
