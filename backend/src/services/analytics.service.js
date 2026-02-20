const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const UsageLog = require('../models/UsageLog');
const Contact = require('../models/Contact');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Get dashboard analytics for a tenant
 */
const getDashboardStats = async (tenantId, { startDate, endDate } = {}) => {
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchStage = { tenant: new mongoose.Types.ObjectId(tenantId) };
  if (startDate || endDate) matchStage.createdAt = dateFilter;

  const [
    totalConversations,
    openConversations,
    totalMessages,
    messageCounts,
    contactCount,
    campaignStats,
  ] = await Promise.all([
    Conversation.countDocuments({ tenant: tenantId, ...(startDate || endDate ? { createdAt: dateFilter } : {}) }),
    Conversation.countDocuments({ tenant: tenantId, status: 'open' }),
    Message.countDocuments({ tenant: tenantId, ...(startDate || endDate ? { createdAt: dateFilter } : {}) }),
    Message.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$direction',
          count: { $sum: 1 },
        },
      },
    ]),
    Contact.countDocuments({ tenant: tenantId }),
    Campaign.aggregate([
      { $match: { tenant: new mongoose.Types.ObjectId(tenantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSent: { $sum: '$stats.sent' },
          totalDelivered: { $sum: '$stats.delivered' },
          totalRead: { $sum: '$stats.read' },
        },
      },
    ]),
  ]);

  const inbound = messageCounts.find((m) => m._id === 'inbound')?.count || 0;
  const outbound = messageCounts.find((m) => m._id === 'outbound')?.count || 0;

  return {
    conversations: {
      total: totalConversations,
      open: openConversations,
    },
    messages: {
      total: totalMessages,
      inbound,
      outbound,
    },
    contacts: contactCount,
    campaigns: campaignStats.reduce((acc, s) => {
      acc[s._id] = {
        count: s.count,
        sent: s.totalSent,
        delivered: s.totalDelivered,
        read: s.totalRead,
      };
      return acc;
    }, {}),
  };
};

/**
 * Get message volume over time (for charts)
 */
const getMessageVolume = async (tenantId, { period = 'day', days = 30 } = {}) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let groupFormat;
  switch (period) {
    case 'hour':
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
      break;
    case 'day':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      break;
    case 'week':
      groupFormat = { $isoWeek: '$timestamp' };
      break;
    case 'month':
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
      break;
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
  }

  const result = await Message.aggregate([
    {
      $match: {
        tenant: new mongoose.Types.ObjectId(tenantId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { date: groupFormat, direction: '$direction' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  // Transform into chart-friendly format
  const dataMap = {};
  for (const entry of result) {
    const key = entry._id.date;
    if (!dataMap[key]) dataMap[key] = { date: key, inbound: 0, outbound: 0, total: 0 };
    dataMap[key][entry._id.direction] = entry.count;
    dataMap[key].total += entry.count;
  }

  return Object.values(dataMap);
};

/**
 * Get response time analytics
 */
const getResponseTimeStats = async (tenantId, { days = 30 } = {}) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Find conversations with both inbound and outbound messages
  const result = await Message.aggregate([
    {
      $match: {
        tenant: new mongoose.Types.ObjectId(tenantId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$conversation',
        firstInbound: {
          $min: {
            $cond: [{ $eq: ['$direction', 'inbound'] }, '$timestamp', null],
          },
        },
        firstOutbound: {
          $min: {
            $cond: [{ $eq: ['$direction', 'outbound'] }, '$timestamp', null],
          },
        },
      },
    },
    {
      $match: {
        firstInbound: { $ne: null },
        firstOutbound: { $ne: null },
      },
    },
    {
      $project: {
        responseTimeMs: { $subtract: ['$firstOutbound', '$firstInbound'] },
      },
    },
    {
      $match: { responseTimeMs: { $gt: 0 } },
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTimeMs' },
        medianSample: { $push: '$responseTimeMs' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!result.length) return { avgResponseTimeMinutes: 0, count: 0 };

  return {
    avgResponseTimeMinutes: Math.round(result[0].avgResponseTime / 60000),
    count: result[0].count,
  };
};

/**
 * Get usage stats for billing
 */
const getUsageStats = async (tenantId, period = null) => {
  const currentPeriod = period || new Date().toISOString().slice(0, 7);
  const usage = await UsageLog.findOne({ tenant: tenantId, period: currentPeriod }).lean();
  return usage || { messages: { total: 0 }, apiCalls: { total: 0 }, campaigns: { sent: 0 } };
};

/**
 * Get agent performance stats
 */
const getAgentPerformance = async (tenantId, { days = 30 } = {}) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await Message.aggregate([
    {
      $match: {
        tenant: new mongoose.Types.ObjectId(tenantId),
        direction: 'outbound',
        sentBy: { $ne: null },
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$sentBy',
        messagesSent: { $sum: 1 },
        conversationsHandled: { $addToSet: '$conversation' },
      },
    },
    {
      $project: {
        messagesSent: 1,
        conversationsHandled: { $size: '$conversationsHandled' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent',
      },
    },
    { $unwind: '$agent' },
    {
      $project: {
        name: '$agent.name',
        email: '$agent.email',
        messagesSent: 1,
        conversationsHandled: 1,
      },
    },
    { $sort: { messagesSent: -1 } },
  ]);

  return result;
};

module.exports = {
  getDashboardStats,
  getMessageVolume,
  getResponseTimeStats,
  getUsageStats,
  getAgentPerformance,
};
