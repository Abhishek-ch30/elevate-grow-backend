const { logSecurityEvent } = require('../utils/logger');

/**
 * Role-based access control middleware
 * Requires user to have specific role(s)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated (should be set by authenticateToken middleware)
    if (!req.user) {
      logSecurityEvent('RBAC_NO_USER_CONTEXT', 'Role check attempted without user context', req);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role;
    
    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      logSecurityEvent('RBAC_ACCESS_DENIED', {
        userRole,
        allowedRoles,
        userId: req.user.id,
        endpoint: req.originalUrl
      }, req);
      
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

/**
 * Admin-only access middleware
 * Shorthand for requireRole('admin')
 */
const requireAdmin = requireRole('admin');

/**
 * User-only access middleware
 * Shorthand for requireRole('user')
 */
const requireUser = requireRole('user');

/**
 * Self-access middleware
 * Allows users to access only their own resources
 * Admin can access any resource
 */
const requireSelfOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      logSecurityEvent('SELF_ACCESS_NO_USER_CONTEXT', 'Self access check attempted without user context', req);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Get target user ID from request params or body
    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    const currentUserId = req.user.id;
    
    if (!targetUserId) {
      logSecurityEvent('SELF_ACCESS_NO_TARGET_USER', {
        userIdParam,
        userId: currentUserId,
        endpoint: req.originalUrl
      }, req);
      
      return res.status(400).json({
        status: 'error',
        message: 'User ID required'
      });
    }
    
    // Check if user is trying to access their own resource
    if (targetUserId !== currentUserId) {
      logSecurityEvent('SELF_ACCESS_VIOLATION', {
        currentUserId,
        targetUserId,
        endpoint: req.originalUrl
      }, req);
      
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own resources'
      });
    }
    
    next();
  };
};

/**
 * Resource ownership middleware
 * Validates that user owns a specific resource based on database query
 */
const requireResourceOwnership = (resourceTable, resourceIdParam = 'id', ownerField = 'user_id') => {
  return async (req, res, next) => {
    if (!req.user) {
      logSecurityEvent('RESOURCE_OWNERSHIP_NO_USER_CONTEXT', 'Resource ownership check attempted without user context', req);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    try {
      const { query } = require('../db/connection');
      const resourceId = req.params[resourceIdParam];
      const currentUserId = req.user.id;
      
      if (!resourceId) {
        return res.status(400).json({
          status: 'error',
          message: 'Resource ID required'
        });
      }
      
      // Query database to check ownership
      const result = await query(
        `SELECT ${ownerField} FROM ${resourceTable} WHERE id = $1`,
        [resourceId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Resource not found'
        });
      }
      
      const resourceOwnerId = result.rows[0][ownerField];
      
      if (resourceOwnerId !== currentUserId) {
        logSecurityEvent('RESOURCE_OWNERSHIP_VIOLATION', {
          currentUserId,
          resourceOwnerId,
          resourceTable,
          resourceId,
          endpoint: req.originalUrl
        }, req);
        
        return res.status(403).json({
          status: 'error',
          message: 'You do not own this resource'
        });
      }
      
      next();
      
    } catch (error) {
      logSecurityEvent('RESOURCE_OWNERSHIP_CHECK_FAILED', {
        error: error.message,
        resourceTable,
        resourceId: req.params[resourceIdParam]
      }, req);
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

/**
 * Admin activity logging middleware
 * Logs all admin actions for audit purposes
 */
const logAdminActivity = (action, resourceType) => {
  return async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return next();
    }
    
    try {
      const { query } = require('../db/connection');
      const resourceId = req.params.id || req.body.id || null;
      
      await query(
        `INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          action,
          resourceType,
          resourceId,
          JSON.stringify({
            endpoint: req.originalUrl,
            method: req.method,
            body: req.method !== 'GET' ? req.body : null
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );
      
    } catch (error) {
      // Log the error but don't fail the request
      console.error('Failed to log admin activity:', error);
    }
    
    next();
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireUser,
  requireSelfOrAdmin,
  requireResourceOwnership,
  logAdminActivity
};