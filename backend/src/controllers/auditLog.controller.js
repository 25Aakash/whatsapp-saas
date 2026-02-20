const auditService = require('../services/audit.service');
const { apiResponse } = require('../utils/helpers');

/**
 * GET /api/v1/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin' && req.query.tenantId
      ? req.query.tenantId
      : req.tenantId;

    const { page, limit, action, startDate, endDate } = req.query;

    const data = await auditService.getLogs(tenantId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      action,
      startDate,
      endDate,
    });

    return apiResponse(res, 200, 'Audit logs fetched', data);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
