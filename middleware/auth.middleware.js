const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { logSecurityEvent, logAuthEvent } = require('../utils/logger');

/**
 * Authentication middleware - verifies JWT token and sets user context
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logSecurityEvent('MISSING_TOKEN', 'No authorization token provided', req);
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Validate token structure
    if (!decoded.id || !decoded.role || !decoded.email) {
      logSecurityEvent('INVALID_TOKEN_STRUCTURE', 'Token missing required fields', req);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token structure'
      });
    }

    // Validate role
    if (!['user', 'admin'].includes(decoded.role)) {
      logSecurityEvent('INVALID_ROLE_IN_TOKEN', { role: decoded.role }, req);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid role in token'
      });
    }

    // Set user context in request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      is_admin: decoded.is_admin || false,
      iat: decoded.iat,
      exp: decoded.exp
    };

    logAuthEvent('TOKEN_VALIDATED', decoded.id, { role: decoded.role });
    next();

  } catch (error) {
    // Handle different types of token errors
    if (error.message === 'Token expired') {
      logSecurityEvent('TOKEN_EXPIRED', 'Expired token used', req);
      return res.status(401).json({
        status: 'error',
        message: 'Token expired'
      });
    }

    if (error.message === 'Invalid token') {
      logSecurityEvent('INVALID_TOKEN', 'Invalid token signature', req);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }

    logSecurityEvent('TOKEN_VERIFICATION_FAILED', error.message, req);
    return res.status(401).json({
      status: 'error',
      message: 'Token verification failed'
    });
  }
};

/**
 * Optional authentication middleware - does not fail if token is missing
 * Used for routes that can work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);

      // Validate token structure
      if (decoded.id && decoded.role && decoded.email && ['user', 'admin'].includes(decoded.role)) {
        req.user = {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          is_admin: decoded.is_admin || false,
          iat: decoded.iat,
          exp: decoded.exp
        };
        logAuthEvent('OPTIONAL_TOKEN_VALIDATED', decoded.id, { role: decoded.role });
      }
    }

    next();

  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};

/**
 * Refresh token validation middleware
 * Used for token refresh endpoints
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logSecurityEvent('MISSING_REFRESH_TOKEN', 'No refresh token provided', req);
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token required'
      });
    }

    // Verify refresh token (using same verification for now)
    const decoded = verifyToken(refreshToken);

    req.refreshTokenData = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      is_admin: decoded.is_admin || false
    };

    logAuthEvent('REFRESH_TOKEN_VALIDATED', decoded.id);
    next();

  } catch (error) {
    logSecurityEvent('INVALID_REFRESH_TOKEN', error.message, req);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Admin signup protection middleware
 * Validates admin signup secret
 */
const validateAdminSignupSecret = (req, res, next) => {
  const { adminSecret } = req.body;
  const expectedSecret = process.env.ADMIN_SIGNUP_SECRET;

  if (!expectedSecret) {
    logSecurityEvent('ADMIN_SIGNUP_SECRET_NOT_CONFIGURED', 'Admin signup attempted but secret not configured', req);
    return res.status(500).json({
      status: 'error',
      message: 'Admin signup not properly configured'
    });
  }

  if (!adminSecret) {
    logSecurityEvent('ADMIN_SIGNUP_NO_SECRET', 'Admin signup attempted without secret', req);
    return res.status(400).json({
      status: 'error',
      message: 'Admin signup secret required'
    });
  }

  if (adminSecret !== expectedSecret) {
    logSecurityEvent('ADMIN_SIGNUP_WRONG_SECRET', 'Admin signup attempted with wrong secret', req);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid admin signup secret'
    });
  }

  logAuthEvent('ADMIN_SIGNUP_SECRET_VALIDATED', null, { ip: req.ip });
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  validateRefreshToken,
  validateAdminSignupSecret
};