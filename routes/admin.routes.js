const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/auth.controller');
const adminController = require('../controllers/admin.controller');

// Import middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdmin, logAdminActivity } = require('../middleware/role.middleware');
const { httpLogger } = require('../utils/logger');

// Apply HTTP logging to all routes
router.use(httpLogger);

/**
 * MIDDLEWARE STACK FOR ALL ADMIN ROUTES
 * 1. authenticateToken - Verify JWT and set req.user
 * 2. requireAdmin - Ensure user has 'admin' role
 */
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * ADMIN AUTHENTICATION ROUTES
 */

/**
 * @route   GET /api/admin/profile
 * @desc    Get current admin profile
 * @access  Private (Admin only)
 */
router.get('/profile', 
  authController.getCurrentUser
);

/**
 * @route   POST /api/admin/change-password
 * @desc    Change admin password
 * @access  Private (Admin only)
 * @body    { currentPassword, newPassword }
 */
router.post('/change-password',
  authController.validatePasswordChange,
  authController.handleValidationErrors,
  logAdminActivity('PASSWORD_CHANGE', 'user'),
  authController.changePassword
);

/**
 * USER MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with optional filters
 * @access  Private (Admin only)
 * @query   role?, profession?, search?
 */
router.get('/users',
  adminController.getAllUsers
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 * @param   id - User UUID
 */
router.get('/users/:id',
  adminController.validateUUIDParam,
  adminController.handleValidationErrors,
  adminController.getUserById
);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role/admin status
 * @access  Private (Admin only)
 * @param   id - User UUID
 * @body    { role?, is_admin? }
 */
router.put('/users/:id/role',
  adminController.validateUUIDParam,
  adminController.validateUserRoleUpdate,
  adminController.handleValidationErrors,
  logAdminActivity('USER_ROLE_UPDATE', 'user'),
  adminController.updateUserRole
);

/**
 * TRAINING PROGRAM MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/training-programs
 * @desc    Get all training programs (including inactive)
 * @access  Private (Admin only)
 */
router.get('/training-programs',
  adminController.getAllTrainingPrograms
);

/**
 * @route   POST /api/admin/training-programs
 * @desc    Create new training program
 * @access  Private (Admin only)
 * @body    { title, description?, duration?, price?, is_active? }
 */
router.post('/training-programs',
  adminController.validateTrainingProgramCreation,
  adminController.handleValidationErrors,
  logAdminActivity('TRAINING_PROGRAM_CREATE', 'training_program'),
  adminController.createTrainingProgram
);

/**
 * @route   PUT /api/admin/training-programs/:id
 * @desc    Update training program
 * @access  Private (Admin only)
 * @param   id - Training program UUID
 * @body    { title?, description?, duration?, price?, is_active? }
 */
router.put('/training-programs/:id',
  adminController.validateUUIDParam,
  adminController.validateTrainingProgramUpdate,
  adminController.handleValidationErrors,
  logAdminActivity('TRAINING_PROGRAM_UPDATE', 'training_program'),
  adminController.updateTrainingProgram
);

/**
 * @route   DELETE /api/admin/training-programs/:id
 * @desc    Delete training program
 * @access  Private (Admin only)
 * @param   id - Training program UUID
 */
router.delete('/training-programs/:id',
  adminController.validateUUIDParam,
  adminController.handleValidationErrors,
  logAdminActivity('TRAINING_PROGRAM_DELETE', 'training_program'),
  adminController.deleteTrainingProgram
);

/**
 * ENROLLMENT MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/enrollments
 * @desc    Get all enrollments with optional filters
 * @access  Private (Admin only)
 * @query   status?, userId?
 */
router.get('/enrollments',
  adminController.getAllEnrollments
);

/**
 * @route   PUT /api/admin/enrollments/:id/status
 * @desc    Update enrollment status
 * @access  Private (Admin only)
 * @param   id - Enrollment UUID
 * @body    { status }
 */
router.put('/enrollments/:id/status',
  adminController.validateUUIDParam,
  adminController.validateEnrollmentStatusUpdate,
  adminController.handleValidationErrors,
  logAdminActivity('ENROLLMENT_STATUS_UPDATE', 'enrollment'),
  adminController.updateEnrollmentStatus
);

/**
 * PAYMENT MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments with optional filters
 * @access  Private (Admin only)
 * @query   status?, userId?
 */
router.get('/payments',
  adminController.getAllPayments
);

/**
 * @route   PUT /api/admin/payments/:id/status
 * @desc    Update payment status
 * @access  Private (Admin only)
 * @param   id - Payment UUID
 * @body    { status }
 */
router.put('/payments/:id/status',
  adminController.validateUUIDParam,
  adminController.validatePaymentStatusUpdate,
  adminController.handleValidationErrors,
  logAdminActivity('PAYMENT_STATUS_UPDATE', 'payment'),
  adminController.updatePaymentStatus
);

/**
 * CERTIFICATE MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/certificates
 * @desc    Get all certificates with optional filters
 * @access  Private (Admin only)
 * @query   userId?, trainingId?
 */
router.get('/certificates',
  adminController.getAllCertificates
);

/**
 * @route   POST /api/admin/certificates
 * @desc    Create new certificate
 * @access  Private (Admin only)
 * @body    { user_id, training_id, issue_date, file_url? }
 */
router.post('/certificates',
  adminController.validateCertificateCreation,
  adminController.handleValidationErrors,
  logAdminActivity('CERTIFICATE_CREATE', 'certificate'),
  adminController.createCertificate
);

/**
 * CONTACT MESSAGE MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/contact-messages
 * @desc    Get all contact messages with optional filters
 * @access  Private (Admin only)
 * @query   status?, search?
 */
router.get('/contact-messages',
  adminController.getAllContactMessages
);

/**
 * @route   PUT /api/admin/contact-messages/:id/status
 * @desc    Update contact message status
 * @access  Private (Admin only)
 * @param   id - Contact message UUID
 * @body    { status }
 */
router.put('/contact-messages/:id/status',
  adminController.validateUUIDParam,
  adminController.validateContactMessageStatusUpdate,
  adminController.handleValidationErrors,
  logAdminActivity('CONTACT_MESSAGE_STATUS_UPDATE', 'contact_message'),
  adminController.updateContactMessageStatus
);

/**
 * ADMIN ACTIVITY AND MONITORING ROUTES
 */

/**
 * @route   GET /api/admin/activity-logs
 * @desc    Get admin activity logs
 * @access  Private (Admin only)
 * @query   adminId?, action?
 */
router.get('/activity-logs',
  adminController.getActivityLogs
);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin only)
 * @returns Comprehensive dashboard statistics
 */
router.get('/dashboard',
  adminController.getDashboard
);

/**
 * SYSTEM MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health check (admin view)
 * @access  Private (Admin only)
 */
router.get('/system/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      system: 'healthy',
      database: 'connected',
      auth: 'active',
      rls: 'enforced',
      timestamp: new Date().toISOString(),
      admin: {
        id: req.user.id,
        email: req.user.email
      }
    }
  });
});

/**
 * @route   GET /api/admin/system/stats
 * @desc    Get system statistics (admin view)
 * @access  Private (Admin only)
 */
router.get('/system/stats', async (req, res) => {
  try {
    const { query } = require('../db/connection');
    
    // Get database statistics
    const stats = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']),
      query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']),
      query('SELECT COUNT(*) as count FROM training_programs WHERE is_active = true'),
      query('SELECT COUNT(*) as count FROM enrollments'),
      query('SELECT COUNT(*) as count FROM payments WHERE status = $1', ['verified']),
      query('SELECT COUNT(*) as count FROM certificates')
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        database_stats: {
          total_users: parseInt(stats[0].rows[0].count),
          total_admins: parseInt(stats[1].rows[0].count),
          active_programs: parseInt(stats[2].rows[0].count),
          total_enrollments: parseInt(stats[3].rows[0].count),
          verified_payments: parseInt(stats[4].rows[0].count),
          total_certificates: parseInt(stats[5].rows[0].count)
        },
        system_info: {
          node_env: process.env.NODE_ENV,
          uptime: process.uptime(),
          memory_usage: process.memoryUsage()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system statistics'
    });
  }
});

/**
 * CATCH ALL - 404 handler for undefined admin routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Admin route not found',
    path: req.originalUrl
  });
});

module.exports = router;