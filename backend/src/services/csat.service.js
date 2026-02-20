const CSATSurvey = require('../models/CSATSurvey');
const CSATResponse = require('../models/CSATResponse');
const whatsappService = require('./whatsapp.service');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

// ============ Survey CRUD ============

const createSurvey = async (tenantId, data) => {
  const survey = await CSATSurvey.create({ tenant: tenantId, ...data });
  return survey;
};

const getSurveys = async (tenantId) => {
  return CSATSurvey.find({ tenant: tenantId }).sort({ createdAt: -1 }).lean();
};

const updateSurvey = async (tenantId, surveyId, data) => {
  const survey = await CSATSurvey.findOneAndUpdate(
    { _id: surveyId, tenant: tenantId },
    { $set: data },
    { new: true }
  );
  if (!survey) throw new ApiError(404, 'Survey not found');
  return survey;
};

const deleteSurvey = async (tenantId, surveyId) => {
  const survey = await CSATSurvey.findOneAndDelete({ _id: surveyId, tenant: tenantId });
  if (!survey) throw new ApiError(404, 'Survey not found');
  return survey;
};

// ============ Send Survey ============

/**
 * Send a CSAT survey to a customer (typically after conversation close)
 */
const sendSurvey = async (tenantId, phoneNumberId, customerPhone, conversationId, surveyId = null) => {
  // Find active survey
  let survey;
  if (surveyId) {
    survey = await CSATSurvey.findOne({ _id: surveyId, tenant: tenantId, isActive: true });
  } else {
    survey = await CSATSurvey.findOne({ tenant: tenantId, isActive: true }).sort({ createdAt: -1 });
  }

  if (!survey) {
    logger.debug('No active CSAT survey configured');
    return null;
  }

  // Check cooldown
  const recentResponse = await CSATResponse.findOne({
    tenant: tenantId,
    customerPhone,
    createdAt: { $gte: new Date(Date.now() - survey.cooldownHours * 60 * 60 * 1000) },
  });

  if (recentResponse) {
    logger.debug(`CSAT cooldown active for ${customerPhone}`);
    return null;
  }

  // Send the survey question via WhatsApp
  try {
    // Use interactive buttons for rating
    const buttons = [];
    if (survey.scale <= 5) {
      for (let i = 1; i <= survey.scale; i++) {
        if (buttons.length < 3) {
          buttons.push({
            type: 'reply',
            reply: { id: `csat_${i}`, title: `${'⭐'.repeat(i)} (${i})` },
          });
        }
      }
    }

    if (buttons.length > 0) {
      await whatsappService.sendInteractiveMessage(tenantId, phoneNumberId, customerPhone, {
        type: 'button',
        body: { text: survey.question },
        action: { buttons },
      });
    } else {
      // For scales > 5, send as text
      await whatsappService.sendTextMessage(tenantId, phoneNumberId, customerPhone, survey.question);
    }

    // Update survey stats
    await CSATSurvey.findByIdAndUpdate(survey._id, { $inc: { 'stats.sent': 1 } });

    logger.info(`CSAT survey sent to ${customerPhone} for conversation ${conversationId}`);
    return { surveyId: survey._id, sent: true };
  } catch (err) {
    logger.error(`Failed to send CSAT survey to ${customerPhone}:`, err.message);
    return null;
  }
};

// ============ Record Response ============

/**
 * Record a CSAT rating from a customer
 */
const recordResponse = async (tenantId, data) => {
  const { conversationId, customerPhone, customerName, rating, feedback, agentId, surveyId, maxRating } = data;

  const response = await CSATResponse.create({
    tenant: tenantId,
    conversation: conversationId,
    customerPhone,
    customerName: customerName || 'Unknown',
    agent: agentId || null,
    survey: surveyId || null,
    rating,
    maxRating: maxRating || 5,
    feedback: feedback || '',
  });

  // Update survey stats
  if (surveyId) {
    const allResponses = await CSATResponse.find({ survey: surveyId });
    const avgRating = allResponses.reduce((sum, r) => sum + r.rating, 0) / allResponses.length;

    await CSATSurvey.findByIdAndUpdate(surveyId, {
      $inc: { 'stats.responses': 1 },
      $set: { 'stats.avgRating': Math.round(avgRating * 10) / 10 },
    });
  }

  return response;
};

// ============ Analytics ============

/**
 * Get CSAT analytics for a tenant
 */
const getAnalytics = async (tenantId, { startDate, endDate, agentId } = {}) => {
  const filter = { tenant: tenantId };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (agentId) filter.agent = agentId;

  const responses = await CSATResponse.find(filter).lean();

  if (responses.length === 0) {
    return {
      totalResponses: 0,
      avgRating: 0,
      avgScore: 0,
      nps: 0,
      distribution: {},
      categories: { promoter: 0, passive: 0, detractor: 0 },
    };
  }

  const totalResponses = responses.length;
  const avgRating = responses.reduce((sum, r) => sum + r.rating, 0) / totalResponses;
  const avgScore = responses.reduce((sum, r) => sum + r.score, 0) / totalResponses;

  // Rating distribution
  const distribution = {};
  responses.forEach((r) => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  });

  // Category counts
  const categories = { promoter: 0, passive: 0, detractor: 0 };
  responses.forEach((r) => {
    categories[r.category]++;
  });

  // NPS = %promoters - %detractors
  const nps = Math.round(
    ((categories.promoter / totalResponses) - (categories.detractor / totalResponses)) * 100
  );

  // Per-agent breakdown
  const agentStats = {};
  for (const r of responses) {
    const aid = r.agent?.toString() || 'unassigned';
    if (!agentStats[aid]) {
      agentStats[aid] = { count: 0, totalRating: 0 };
    }
    agentStats[aid].count++;
    agentStats[aid].totalRating += r.rating;
  }
  Object.keys(agentStats).forEach((aid) => {
    agentStats[aid].avgRating = Math.round((agentStats[aid].totalRating / agentStats[aid].count) * 10) / 10;
  });

  return {
    totalResponses,
    avgRating: Math.round(avgRating * 10) / 10,
    avgScore: Math.round(avgScore),
    nps,
    distribution,
    categories,
    agentStats,
  };
};

/**
 * Get recent CSAT responses
 */
const getResponses = async (tenantId, { page = 1, limit = 20, category } = {}) => {
  const filter = { tenant: tenantId };
  if (category) filter.category = category;
  const skip = (page - 1) * limit;

  const [responses, total] = await Promise.all([
    CSATResponse.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('agent', 'name email')
      .lean(),
    CSATResponse.countDocuments(filter),
  ]);

  return { responses, total, page, pages: Math.ceil(total / limit) };
};

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
