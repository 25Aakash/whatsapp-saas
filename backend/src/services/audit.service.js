const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Log an audit event (fire-and-forget)
 */
const logAction = async ({
  tenantId,
  userId,
  userName,
  userEmail,
  action,
  resource,
  details,
  ipAddress,
  userAgent,
}) => {
  try {
    await AuditLog.create({
      tenant: tenantId || undefined,
      user: userId || undefined,
      userName,
      userEmail,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    logger.debug(`Audit log write failed: ${err.message}`);
  }
};

/**
 * Express middleware factory — auto-log an action after res.finish
 */
const auditMiddleware = (action, getResource) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only log on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resource = typeof getResource === 'function' ? getResource(req, body) : undefined;
        logAction({
          tenantId: req.tenantId,
          userId: req.user?._id,
          userName: req.user?.name,
          userEmail: req.user?.email,
          action,
          resource,
          details: { method: req.method, path: req.originalUrl },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Get audit logs for a tenant (paginated)
 */
const getLogs = async (tenantId, { page = 1, limit = 50, action, startDate, endDate } = {}) => {
  const filter = {};
  if (tenantId) filter.tenant = tenantId;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = { logAction, auditMiddleware, getLogs };
