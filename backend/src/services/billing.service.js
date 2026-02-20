const Tenant = require('../models/Tenant');
const UsageLog = require('../models/UsageLog');
const { ApiError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * Get the credit balance for a tenant
 */
const getCredits = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  return {
    balance: tenant.credits?.balance || 0,
    totalAllocated: tenant.credits?.totalAllocated || 0,
    totalUsed: tenant.credits?.totalUsed || 0,
    lastTopUp: tenant.credits?.lastTopUp || null,
    costPerMessage: tenant.credits?.costPerMessage || 1,
  };
};

/**
 * Check if tenant has enough credits to send a message
 * @returns {{ allowed: boolean, balance: number, cost: number }}
 */
const checkCredits = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  const balance = tenant.credits?.balance || 0;
  const cost = tenant.credits?.costPerMessage || 1;

  return {
    allowed: balance >= cost,
    balance,
    cost,
    remaining: Math.max(0, balance),
  };
};

/**
 * Deduct credits for an outbound message (atomic operation)
 * @returns {{ success: boolean, newBalance: number }}
 */
const deductCredit = async (tenantId, amount = null) => {
  // If amount not specified, use tenant's costPerMessage
  if (amount === null) {
    const tenant = await Tenant.findById(tenantId).lean();
    amount = tenant?.credits?.costPerMessage || 1;
  }

  // Atomic: only deduct if balance >= amount
  const tenant = await Tenant.findOneAndUpdate(
    { _id: tenantId, 'credits.balance': { $gte: amount } },
    {
      $inc: {
        'credits.balance': -amount,
        'credits.totalUsed': amount,
      },
    },
    { new: true }
  );

  if (!tenant) {
    return { success: false, newBalance: 0 };
  }

  return { success: true, newBalance: tenant.credits.balance };
};

/**
 * Admin: Set/add credits for a tenant
 * @param {string} tenantId
 * @param {number} credits - Number of credits to add (positive) or set (if mode is 'set')
 * @param {'add'|'set'} mode - 'add' to add credits, 'set' to set absolute value
 */
const setCredits = async (tenantId, credits, mode = 'add') => {
  if (typeof credits !== 'number' || credits < 0) {
    throw new ApiError(400, 'Credits must be a non-negative number');
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  if (mode === 'set') {
    // Set to exact balance
    const diff = credits - (tenant.credits?.balance || 0);
    tenant.credits = {
      ...tenant.credits?.toObject?.() || tenant.credits || {},
      balance: credits,
      totalAllocated: (tenant.credits?.totalAllocated || 0) + Math.max(0, diff),
      lastTopUp: new Date(),
    };
  } else {
    // Add credits
    tenant.credits = {
      ...tenant.credits?.toObject?.() || tenant.credits || {},
      balance: (tenant.credits?.balance || 0) + credits,
      totalAllocated: (tenant.credits?.totalAllocated || 0) + credits,
      lastTopUp: new Date(),
    };
  }

  await tenant.save();
  logger.info(`Admin ${mode === 'set' ? 'set' : 'added'} ${credits} credits for tenant ${tenantId}. New balance: ${tenant.credits.balance}`);
  return tenant;
};

/**
 * Admin: Set cost per message for a tenant
 */
const setCostPerMessage = async (tenantId, cost) => {
  if (typeof cost !== 'number' || cost < 0) {
    throw new ApiError(400, 'Cost must be a non-negative number');
  }

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { 'credits.costPerMessage': cost } },
    { new: true }
  );

  if (!tenant) throw new ApiError(404, 'Tenant not found');
  logger.info(`Set cost per message to ${cost} for tenant ${tenantId}`);
  return tenant;
};

/**
 * Get billing/credits overview for a tenant
 */
const getBillingOverview = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  const period = new Date().toISOString().slice(0, 7);
  const usage = await UsageLog.findOne({ tenant: tenantId, period }).lean();

  return {
    credits: {
      balance: tenant.credits?.balance || 0,
      totalAllocated: tenant.credits?.totalAllocated || 0,
      totalUsed: tenant.credits?.totalUsed || 0,
      lastTopUp: tenant.credits?.lastTopUp || null,
      costPerMessage: tenant.credits?.costPerMessage || 1,
    },
    planLimits: tenant.planLimits || {},
    currentUsage: {
      messages: usage?.messages?.total || 0,
      messagesOutbound: usage?.messages?.outbound || 0,
      messagesInbound: usage?.messages?.inbound || 0,
      apiCalls: usage?.apiCalls?.total || 0,
      campaigns: usage?.campaigns?.sent || 0,
    },
    period,
  };
};

module.exports = {
  getCredits,
  checkCredits,
  deductCredit,
  setCredits,
  setCostPerMessage,
  getBillingOverview,
};
