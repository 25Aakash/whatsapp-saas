const authService = require('../services/auth.service');
const { apiResponse } = require('../utils/helpers');

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return apiResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/customer-register
 * Public endpoint for customer self-registration
 */
const customerRegister = async (req, res, next) => {
  try {
    const result = await authService.customerRegister(req.body);
    return apiResponse(res, 201, 'Account created successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/register
 * Admin creates users or customer invites team members
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body, req.user);
    return apiResponse(res, 201, 'User registered successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user._id);
    return apiResponse(res, 200, 'Profile fetched', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/team
 */
const getTeamMembers = async (req, res, next) => {
  try {
    const tenantId = req.user.role === 'admin'
      ? req.query.tenantId
      : (req.user.tenant?._id || req.user.tenant);

    if (!tenantId) {
      return apiResponse(res, 400, 'Tenant ID is required');
    }

    const members = await authService.getTeamMembers(tenantId);
    return apiResponse(res, 200, 'Team members fetched', { members });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/auth/team/:id
 */
const removeTeamMember = async (req, res, next) => {
  try {
    await authService.removeTeamMember(req.params.id, req.user);
    return apiResponse(res, 200, 'Team member removed');
  } catch (error) {
    next(error);
  }
};

module.exports = { login, customerRegister, register, getMe, getTeamMembers, removeTeamMember };
