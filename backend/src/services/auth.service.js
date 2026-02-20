const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const env = require('../config/env');
const { ApiError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

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
const login = async (email, password, twoFactorToken = null) => {
  const user = await User.findOne({ email, isActive: true }).select('+password +twoFactorSecret').populate('tenant');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    if (!twoFactorToken) {
      // Return partial response indicating 2FA is needed
      return {
        requires2FA: true,
        userId: user._id,
      };
    }
    // Validate TOTP
    try {
      const otplib = require('otplib');
      const isValid = otplib.authenticator.verify({ token: twoFactorToken, secret: user.twoFactorSecret });
      if (!isValid) {
        throw new ApiError(401, 'Invalid 2FA code');
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(401, 'Invalid 2FA code');
    }
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

  // Send welcome email (best-effort)
  try {
    const emailService = require('./email.service');
    await emailService.sendWelcomeEmail(email, name, businessName);
  } catch (emailErr) {
    logger.debug(`Welcome email failed: ${emailErr.message}`);
  }

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

  // Send team invite email (best-effort)
  if (createdBy) {
    try {
      const emailService = require('./email.service');
      const teamName = populated.tenant?.name || 'the team';
      await emailService.sendTeamInviteEmail(email, name, teamName, createdBy.name);
    } catch (emailErr) {
      logger.debug(`Team invite email failed: ${emailErr.message}`);
    }
  }

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

// =========== Two-Factor Auth (TOTP) ===========

/**
 * Enable 2FA — generate secret and return QR URL
 */
const enable2FA = async (userId) => {
  let otplib;
  try {
    otplib = require('otplib');
  } catch {
    throw new ApiError(503, '2FA not available — otplib package not installed');
  }

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'User not found');
  if (user.twoFactorEnabled) throw new ApiError(400, '2FA is already enabled');

  const secret = otplib.authenticator.generateSecret();
  user.twoFactorSecret = secret;
  await user.save({ validateBeforeSave: false });

  const otpauthUrl = otplib.authenticator.keyuri(user.email, 'WhatsApp SaaS', secret);

  return { secret, otpauthUrl };
};

/**
 * Verify the TOTP code and finalize 2FA enable
 */
const verify2FA = async (userId, token) => {
  let otplib;
  try {
    otplib = require('otplib');
  } catch {
    throw new ApiError(503, '2FA not available');
  }

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.twoFactorSecret) throw new ApiError(400, 'Call enable 2FA first');

  const isValid = otplib.authenticator.verify({ token, secret: user.twoFactorSecret });
  if (!isValid) throw new ApiError(400, 'Invalid 2FA code');

  user.twoFactorEnabled = true;
  await user.save({ validateBeforeSave: false });

  // Send confirmation email
  try {
    const emailService = require('./email.service');
    await emailService.send2FAEnabledEmail(user.email, user.name);
  } catch (err) {
    logger.debug(`2FA enabled email failed: ${err.message}`);
  }

  return { enabled: true };
};

/**
 * Disable 2FA
 */
const disable2FA = async (userId, token) => {
  let otplib;
  try {
    otplib = require('otplib');
  } catch {
    throw new ApiError(503, '2FA not available');
  }

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.twoFactorEnabled) throw new ApiError(400, '2FA is not enabled');

  const isValid = otplib.authenticator.verify({ token, secret: user.twoFactorSecret });
  if (!isValid) throw new ApiError(400, 'Invalid 2FA code');

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  await user.save({ validateBeforeSave: false });

  return { enabled: false };
};

/**
 * Validate 2FA during login (called after password check)
 */
const validate2FALogin = async (userId, token) => {
  let otplib;
  try {
    otplib = require('otplib');
  } catch {
    throw new ApiError(503, '2FA not available');
  }

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'User not found');

  const isValid = otplib.authenticator.verify({ token, secret: user.twoFactorSecret });
  if (!isValid) throw new ApiError(401, 'Invalid 2FA code');

  return true;
};

module.exports = { login, customerRegister, register, getProfile, generateToken, getTeamMembers, removeTeamMember, enable2FA, verify2FA, disable2FA, validate2FALogin };
