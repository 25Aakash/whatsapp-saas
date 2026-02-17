const tenantService = require('../services/tenant.service');
const { apiResponse } = require('../utils/helpers');

/**
 * GET /api/v1/tenants/my-account
 * Customer: get own tenant/account details
 */
const getMyAccount = async (req, res, next) => {
  try {
    const tenantId = req.user.tenant?._id || req.user.tenant;
    if (!tenantId) {
      return apiResponse(res, 404, 'No account found. Please contact support.');
    }
    const tenant = await tenantService.getTenantById(tenantId);
    return apiResponse(res, 200, 'Account fetched', { tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tenants/embedded-signup
 * Customer: connect WhatsApp via Embedded Signup
 */
const embeddedSignup = async (req, res, next) => {
  try {
    const { code } = req.body;
    // Always use the customer's own tenant
    const tenantId = req.user.tenant?._id || req.user.tenant;
    if (!tenantId) {
      return apiResponse(res, 400, 'No tenant account found for your user.');
    }
    const tenant = await tenantService.handleEmbeddedSignup(code, tenantId);
    return apiResponse(res, 201, 'WhatsApp Business Account connected successfully', { tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tenants/my-account/status
 * Customer: check own WhatsApp connection health
 */
const checkMyStatus = async (req, res, next) => {
  try {
    const tenantId = req.user.tenant?._id || req.user.tenant;
    if (!tenantId) {
      return apiResponse(res, 404, 'No account found.');
    }
    const health = await tenantService.checkTenantHealth(tenantId);
    return apiResponse(res, 200, 'Health check complete', { health });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tenants
 * Admin: create a new tenant manually
 */
const createTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.createTenant(req.body);
    return apiResponse(res, 201, 'Tenant created', { tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tenants
 * Admin: list all tenants/customers
 */
const listTenants = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;

    const tenants = await tenantService.listTenants(filter);
    return apiResponse(res, 200, 'Tenants fetched', { tenants });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tenants/:id
 * Admin: get tenant by ID
 */
const getTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    return apiResponse(res, 200, 'Tenant fetched', { tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tenants/:id/status
 * Admin: check tenant WhatsApp connection health
 */
const checkStatus = async (req, res, next) => {
  try {
    const health = await tenantService.checkTenantHealth(req.params.id);
    return apiResponse(res, 200, 'Health check complete', { health });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/tenants/:id
 * Admin: update tenant settings
 */
const updateTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body);
    return apiResponse(res, 200, 'Tenant updated', { tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/tenants/:id
 * Admin: deactivate tenant
 */
const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.deactivateTenant(req.params.id);
    return apiResponse(res, 200, 'Tenant deactivated', { tenant });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAccount,
  embeddedSignup,
  checkMyStatus,
  createTenant,
  listTenants,
  getTenant,
  checkStatus,
  updateTenant,
  deleteTenant,
};
