const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { apiResponse } = require('../utils/helpers');

/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse(res, 401, 'Authentication required. Please provide a valid token.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.id).populate('tenant');
    if (!user) {
      return apiResponse(res, 401, 'User not found. Token may be invalid.');
    }

    if (!user.isActive) {
      return apiResponse(res, 403, 'Account is deactivated. Contact your administrator.');
    }

    // Attach user and tenant info to request
    req.user = user;
    req.tenantId = user.tenant?._id || null;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return apiResponse(res, 401, 'Token has expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      return apiResponse(res, 401, 'Invalid token.');
    }
    return apiResponse(res, 500, 'Authentication error.');
  }
};

module.exports = { authenticate };
