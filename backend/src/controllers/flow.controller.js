const flowService = require('../services/flow.service');
const { ApiError, catchAsync } = require('../middlewares/error.middleware');

const createFlow = catchAsync(async (req, res) => {
  const flow = await flowService.createFlow(req.user.tenant, req.user._id, req.body);
  res.status(201).json({ success: true, data: flow });
});

const getFlows = catchAsync(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await flowService.getFlows(req.user.tenant, { page: +page, limit: +limit, status });
  res.json({ success: true, ...result });
});

const getFlow = catchAsync(async (req, res) => {
  const flow = await flowService.getFlowById(req.user.tenant, req.params.id);
  res.json({ success: true, data: flow });
});

const updateFlow = catchAsync(async (req, res) => {
  const flow = await flowService.updateFlow(req.user.tenant, req.params.id, req.body);
  res.json({ success: true, data: flow });
});

const deleteFlow = catchAsync(async (req, res) => {
  await flowService.deleteFlow(req.user.tenant, req.params.id);
  res.json({ success: true, message: 'Flow deleted' });
});

const activateFlow = catchAsync(async (req, res) => {
  const flow = await flowService.toggleFlowStatus(req.user.tenant, req.params.id, 'active');
  res.json({ success: true, data: flow });
});

const pauseFlow = catchAsync(async (req, res) => {
  const flow = await flowService.toggleFlowStatus(req.user.tenant, req.params.id, 'paused');
  res.json({ success: true, data: flow });
});

const getFlowSessions = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await flowService.getFlowSessions(req.user.tenant, req.params.id, { page: +page, limit: +limit });
  res.json({ success: true, ...result });
});

module.exports = {
  createFlow,
  getFlows,
  getFlow,
  updateFlow,
  deleteFlow,
  activateFlow,
  pauseFlow,
  getFlowSessions,
};
