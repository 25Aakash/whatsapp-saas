const analyticsService = require('../services/analytics.service');
const billingService = require('../services/billing.service');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Contact = require('../models/Contact');
const { apiResponse } = require('../utils/helpers');

/**
 * GET /api/v1/analytics/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    if (!tenantId) return apiResponse(res, 400, 'Tenant context required');

    const { startDate, endDate } = req.query;
    const stats = await analyticsService.getDashboardStats(tenantId, { startDate, endDate });
    return apiResponse(res, 200, 'Dashboard stats fetched', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/messages
 */
const getMessageVolume = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    const { period, days } = req.query;
    const data = await analyticsService.getMessageVolume(tenantId, {
      period,
      days: parseInt(days, 10) || 30,
    });
    return apiResponse(res, 200, 'Message volume fetched', { volume: data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/response-time
 */
const getResponseTime = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    const data = await analyticsService.getResponseTimeStats(tenantId, {
      days: parseInt(req.query.days, 10) || 30,
    });
    return apiResponse(res, 200, 'Response time stats fetched', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/agents
 */
const getAgentPerformance = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    const data = await analyticsService.getAgentPerformance(tenantId, {
      days: parseInt(req.query.days, 10) || 30,
    });
    return apiResponse(res, 200, 'Agent performance fetched', { agents: data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/usage
 */
const getUsage = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    const data = await analyticsService.getUsageStats(tenantId, req.query.period);
    return apiResponse(res, 200, 'Usage stats fetched', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/billing
 * Get credits & usage overview
 */
const getBilling = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;
    const data = await billingService.getBillingOverview(tenantId);
    return apiResponse(res, 200, 'Billing overview fetched', data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/analytics/billing/credits
 * Admin: set or add credits for a tenant
 * Body: { tenantId, credits, mode: 'add' | 'set' }
 */
const setCredits = async (req, res, next) => {
  try {
    const { tenantId, credits, mode } = req.body;
    if (!tenantId || credits === undefined) {
      return apiResponse(res, 400, 'tenantId and credits are required');
    }
    const tenant = await billingService.setCredits(tenantId, credits, mode || 'add');
    return apiResponse(res, 200, `Credits ${mode === 'set' ? 'set' : 'added'} successfully`, {
      tenant: { _id: tenant._id, name: tenant.name, credits: tenant.credits },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/analytics/billing/cost-per-message
 * Admin: set cost per message for a tenant
 * Body: { tenantId, cost }
 */
const setCostPerMessage = async (req, res, next) => {
  try {
    const { tenantId, cost } = req.body;
    if (!tenantId || cost === undefined) {
      return apiResponse(res, 400, 'tenantId and cost are required');
    }
    const tenant = await billingService.setCostPerMessage(tenantId, cost);
    return apiResponse(res, 200, 'Cost per message updated', {
      tenant: { _id: tenant._id, name: tenant.name, credits: tenant.credits },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/export/csv
 * Export messages, conversations, or contacts as CSV
 */
const exportCSV = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    const type = req.query.type || 'messages';
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    const hasDateFilter = startDate || endDate;

    let rows = [];
    let headers = [];

    switch (type) {
      case 'messages': {
        headers = ['Date', 'From', 'To', 'Direction', 'Type', 'Body', 'Status'];
        const filter = { tenant: tenantId };
        if (hasDateFilter) filter.createdAt = dateFilter;
        const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
        rows = messages.map((m) => [
          m.timestamp?.toISOString() || '',
          m.from || '',
          m.to || '',
          m.direction || '',
          m.type || '',
          `"${(m.body || '').replace(/"/g, '""')}"`,
          m.status || '',
        ]);
        break;
      }
      case 'conversations': {
        headers = ['Created', 'Contact Phone', 'Contact Name', 'Status', 'Tags', 'Message Count'];
        const filter = { tenant: tenantId };
        if (hasDateFilter) filter.createdAt = dateFilter;
        const convos = await Conversation.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
        rows = convos.map((c) => [
          c.createdAt?.toISOString() || '',
          c.contactPhone || '',
          c.contactName || '',
          c.status || '',
          (c.tags || []).join(';'),
          c.messageCount || 0,
        ]);
        break;
      }
      case 'contacts': {
        headers = ['Name', 'Phone', 'Email', 'Tags', 'Created'];
        const filter = { tenant: tenantId };
        const contacts = await Contact.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
        rows = contacts.map((c) => [
          `"${(c.name || '').replace(/"/g, '""')}"`,
          c.phone || '',
          c.email || '',
          (c.tags || []).join(';'),
          c.createdAt?.toISOString() || '',
        ]);
        break;
      }
      default:
        return apiResponse(res, 400, 'Invalid export type. Use: messages, conversations, or contacts');
    }

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getMessageVolume, getResponseTime, getAgentPerformance, getUsage, getBilling, setCredits, setCostPerMessage, exportCSV };
