const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

/**
 * Generate JWT token with user information
 * @param {Object} payload - User payload containing id, role, email
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  try {
    // Ensure payload contains required fields
    const { id, role, email, is_admin } = payload;
    
    if (!id || !role || !email) {
      throw new Error('Missing required fields in token payload');
    }
    
    // Create token payload with only necessary information
    const tokenPayload = {
      id,
      role,
      email,
      is_admin: is_admin || false,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'qthink-solutions-backend',
      audience: 'qthink-solutions-users'
    });
    
    logger.info(`Token generated for user ${id} with role ${role}`);
    return token;
    
  } catch (error) {
    logger.error('Token generation failed:', error);
    throw new Error('Token generation failed');
  }
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'qthink-solutions-backend',
      audience: 'qthink-solutions-users'
    });
    
    // Validate required fields in decoded token
    if (!decoded.id || !decoded.role || !decoded.email) {
      throw new Error('Invalid token payload structure');
    }
    
    // Ensure role is valid
    if (!['user', 'admin'].includes(decoded.role)) {
      throw new Error('Invalid role in token');
    }
    
    logger.info(`Token verified for user ${decoded.id} with role ${decoded.role}`);
    return decoded;
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token signature');
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired');
      throw new Error('Token expired');
    } else if (error.name === 'NotBeforeError') {
      logger.warn('Token not active');
      throw new Error('Token not active');
    } else {
      logger.error('Token verification failed:', error);
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Decode token without verification (for debugging only)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Token decode failed:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {Object} decoded - Decoded token payload
 * @returns {boolean} True if expired
 */
const isTokenExpired = (decoded) => {
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  decodeToken,
  isTokenExpired
};