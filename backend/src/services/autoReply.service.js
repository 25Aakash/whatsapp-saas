const AutoReplyRule = require('../models/AutoReplyRule');
const { ApiError } = require('../middlewares/error.middleware');
const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Create an auto-reply rule
 */
const createRule = async (tenantId, userId, data) => {
  return AutoReplyRule.create({
    tenant: tenantId,
    createdBy: userId,
    name: data.name,
    trigger: data.trigger,
    action: data.action,
    businessHours: data.businessHours || undefined,
    priority: data.priority || 10,
    cooldownMinutes: data.cooldownMinutes || 60,
  });
};

/**
 * List rules for a tenant
 */
const listRules = async (tenantId) => {
  return AutoReplyRule.find({ tenant: tenantId }).sort({ priority: 1, createdAt: 1 }).lean();
};

/**
 * Update a rule
 */
const updateRule = async (tenantId, ruleId, updates) => {
  const rule = await AutoReplyRule.findOneAndUpdate(
    { _id: ruleId, tenant: tenantId },
    { $set: updates },
    { new: true }
  );
  if (!rule) throw new ApiError(404, 'Auto-reply rule not found');
  return rule;
};

/**
 * Delete a rule
 */
const deleteRule = async (tenantId, ruleId) => {
  const rule = await AutoReplyRule.findOneAndDelete({ _id: ruleId, tenant: tenantId });
  if (!rule) throw new ApiError(404, 'Auto-reply rule not found');
  return rule;
};

/**
 * Evaluate rules against an inbound message and return the matching rule (if any)
 * @returns {Object|null} Matching rule or null
 */
const evaluateRules = async (tenantId, messageText, conversationId) => {
  const rules = await AutoReplyRule.find({
    tenant: tenantId,
    isActive: true,
  }).sort({ priority: 1 }).lean();

  for (const rule of rules) {
    // Check cooldown
    const cooldownKey = `ar:cooldown:${rule._id}:${conversationId}`;
    try {
      const redis = getRedisConnection();
      const isCoolingDown = await redis.get(cooldownKey);
      if (isCoolingDown) continue;
    } catch {
      // Redis down, skip cooldown check
    }

    let matches = false;

    switch (rule.trigger.type) {
      case 'keyword': {
        const keywords = rule.trigger.value.split(',').map((k) => k.trim().toLowerCase());
        const text = rule.trigger.caseSensitive ? messageText : messageText.toLowerCase();
        matches = keywords.some((kw) => text.includes(kw));
        break;
      }
      case 'regex': {
        try {
          const regex = new RegExp(rule.trigger.value, rule.trigger.caseSensitive ? '' : 'i');
          matches = regex.test(messageText);
        } catch {
          logger.warn(`Invalid regex in auto-reply rule ${rule._id}: ${rule.trigger.value}`);
        }
        break;
      }
      case 'first_message':
        // Will be checked by the caller (conversation.isNew)
        matches = true; // Placeholder — caller should only pass if this is a new conversation
        break;
      case 'out_of_hours':
        matches = isOutOfHours(rule.businessHours);
        break;
      case 'all':
        matches = true;
        break;
      default:
        break;
    }

    if (matches) {
      // Set cooldown
      try {
        const redis = getRedisConnection();
        await redis.set(cooldownKey, '1', 'EX', rule.cooldownMinutes * 60);
      } catch {
        // Redis down, skip cooldown
      }

      // Increment stats
      AutoReplyRule.findByIdAndUpdate(rule._id, {
        $inc: { 'stats.triggered': 1 },
        $set: { 'stats.lastTriggeredAt': new Date() },
      }).catch(() => {});

      return rule;
    }
  }

  return null;
};

/**
 * Check if current time is outside business hours
 */
const isOutOfHours = (businessHours) => {
  if (!businessHours?.schedule) return false;

  const now = new Date();
  const tz = businessHours.timezone || 'UTC';

  // Get current day and time in the business timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  const currentTime = `${hour}:${minute}`;

  const schedule = businessHours.schedule instanceof Map
    ? businessHours.schedule.get(weekday)
    : businessHours.schedule[weekday];

  if (!schedule || !schedule.enabled) return true; // Day not enabled = out of hours
  if (currentTime < schedule.start || currentTime > schedule.end) return true;

  return false;
};

module.exports = {
  createRule,
  listRules,
  updateRule,
  deleteRule,
  evaluateRules,
};
