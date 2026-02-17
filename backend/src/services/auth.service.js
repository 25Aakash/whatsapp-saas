const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const env = require('../config/env');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * Generate JWT token for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant?._id || user.tenant || null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

/**
 * Login user with email and password
 */
const login = async (email, password) => {
  const user = await User.findOne({ email, isActive: true }).select('+password').populate('tenant');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant: user.tenant,
      avatar: user.avatar,
    },
  };
};

/**
 * Public customer self-registration
 * Creates a new Tenant + Customer user in one step
 */
const customerRegister = async ({ email, password, name, businessName }) => {
  // Check if user already exists
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  // Create tenant for this customer
  const tenant = await Tenant.create({
    name: businessName,
    plan: 'free',
    onboardingStatus: 'pending',
  });

  // Create customer user linked to tenant
  const user = await User.create({
    email,
    password,
    name,
    role: 'customer',
    tenant: tenant._id,
  });

  const populated = await User.findById(user._id).populate('tenant');
  const token = generateToken(populated);

  return {
    token,
    user: {
      id: populated._id,
      email: populated.email,
      name: populated.name,
      role: populated.role,
      tenant: populated.tenant,
    },
  };
};

/**
 * Admin creates a user, or customer invites a team member (sub-user)
 */
const register = async ({ email, password, name, role, tenantId }, createdBy = null) => {
  // Check if user already exists
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'User with this email already exists');
  }

  // Determine role and tenant based on who is creating the user
  let finalRole = role || 'customer_agent';
  let finalTenantId = tenantId;

  if (createdBy) {
    if (createdBy.role === 'customer') {
      // Customer can only create customer_agent for their own tenant
      finalRole = 'customer_agent';
      finalTenantId = createdBy.tenant?._id || createdBy.tenant;
    } else if (createdBy.role === 'customer_agent') {
      throw new ApiError(403, 'Team members cannot create users');
    }
    // Admin can create any role
  }

  const user = await User.create({
    email,
    password,
    name,
    role: finalRole,
    tenant: finalTenantId || null,
  });

  const populated = await User.findById(user._id).populate('tenant');
  const token = generateToken(populated);

  return {
    token,
    user: {
      id: populated._id,
      email: populated.email,
      name: populated.name,
      role: populated.role,
      tenant: populated.tenant,
    },
  };
};

/**
 * Get current user profile
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId).populate('tenant');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

/**
 * Get team members for a tenant
 */
const getTeamMembers = async (tenantId) => {
  const members = await User.find({ tenant: tenantId, isActive: true })
    .select('name email role lastLoginAt createdAt avatar')
    .sort({ createdAt: -1 });
  return members;
};

/**
 * Remove a team member (deactivate)
 */
const removeTeamMember = async (memberId, requestingUser) => {
  const member = await User.findById(memberId);
  if (!member) {
    throw new ApiError(404, 'User not found');
  }

  // Can't remove yourself
  if (member._id.toString() === requestingUser._id.toString()) {
    throw new ApiError(400, 'You cannot remove yourself');
  }

  // Customer can only remove their own team members
  if (requestingUser.role === 'customer') {
    const reqTenantId = requestingUser.tenant?._id || requestingUser.tenant;
    if (member.tenant?.toString() !== reqTenantId?.toString()) {
      throw new ApiError(403, 'You can only remove your own team members');
    }
  }

  member.isActive = false;
  await member.save({ validateBeforeSave: false });
  return member;
};

module.exports = { login, customerRegister, register, getProfile, generateToken, getTeamMembers, removeTeamMember };
