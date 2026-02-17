const { apiResponse } = require('../utils/helpers');

/**
 * Role-based access control middleware
 * @param  {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse(res, 401, 'Authentication required.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return apiResponse(
        res,
        403,
        `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

/**
 * Ensure user can only access their own tenant's data
 * Admins can access any tenant
 * Customers and customer_agents can only access their own tenant
 */
const tenantAccess = (req, res, next) => {
  if (!req.user) {
    return apiResponse(res, 401, 'Authentication required.');
  }

  // Admins can access everything
  if (req.user.role === 'admin') {
    return next();
  }

  // For tenant-specific routes, check tenant matches
  const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  if (requestedTenantId && req.user.tenant?.toString() !== requestedTenantId) {
    return apiResponse(res, 403, 'You do not have access to this resource.');
  }

  next();
};

module.exports = { authorize, tenantAccess };
