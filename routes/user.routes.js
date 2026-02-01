const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');

// Import middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireUser } = require('../middleware/role.middleware');
const { httpLogger } = require('../utils/logger');

// Apply HTTP logging to all routes
router.use(httpLogger);

/**
 * MIDDLEWARE STACK FOR ALL USER ROUTES
 * 1. authenticateToken - Verify JWT and set req.user
 * 2. requireUser - Ensure user has 'user' role
 */
router.use(authenticateToken);
router.use(requireUser);

/**
 * USER AUTHENTICATION ROUTES
 */

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private (User only)
 * @note    RLS enforces user can only see their own profile
 */
router.get('/profile', 
  userController.getProfile
);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private (User only)
 * @body    { full_name?, phone?, profession?, college?, company? }
 * @note    Role and is_admin fields are protected from updates
 */
router.put('/profile',
  userController.validateProfileUpdate,
  userController.handleValidationErrors,
  userController.updateProfile
);

/**
 * @route   POST /api/user/change-password
 * @desc    Change user password
 * @access  Private (User only)
 * @body    { currentPassword, newPassword }
 */
router.post('/change-password',
  authController.validatePasswordChange,
  authController.handleValidationErrors,
  authController.changePassword
);

/**
 * TRAINING PROGRAM ROUTES
 */

/**
 * @route   GET /api/user/training-programs
 * @desc    Get available training programs (active only)
 * @access  Private (User only)
 * @note    RLS enforces users only see active programs
 */
router.get('/training-programs',
  userController.getTrainingPrograms
);

/**
 * @route   GET /api/user/training-programs/:id
 * @desc    Get single training program details
 * @access  Private (User only)
 * @param   id - Training program UUID
 */
router.get('/training-programs/:id',
  userController.validateTrainingIdParam,
  userController.handleValidationErrors,
  userController.getTrainingProgramDetails
);

/**
 * ENROLLMENT ROUTES
 */

/**
 * @route   GET /api/user/enrollments
 * @desc    Get user's enrollments
 * @access  Private (User only)
 * @note    RLS enforces user only sees their own enrollments
 */
router.get('/enrollments',
  userController.getEnrollments
);

/**
 * @route   POST /api/user/enrollments
 * @desc    Create new enrollment with user details
 * @access  Private (User only)
 * @body    { training_id, full_name, email, phone }
 * @note    RLS enforces enrollment is created for current user only
 */
router.post('/enrollments',
  userController.validateEnrollmentWithDetails,
  userController.handleValidationErrors,
  userController.createEnrollmentWithDetails
);

/**
 * @route   POST /api/user/enrollments/:id/payment/initiate
 * @desc    Initiate UPI payment for enrollment
 * @access  Private (User only)
 * @param   id - Enrollment ID
 * @note    Generates UPI QR code and starts payment timer
 */
router.post('/enrollments/:id/payment/initiate',
  userController.validateEnrollmentIdParam,
  userController.handleValidationErrors,
  userController.initiatePayment
);

/**
 * @route   POST /api/user/payments/:id/confirm
 * @desc    Confirm payment completion by user
 * @access  Private (User only)
 * @param   id - Payment ID
 * @body    { transaction_reference? }
 */
router.post('/payments/:id/confirm',
  userController.validatePaymentIdParam,
  userController.handleValidationErrors,
  userController.confirmPayment
);

/**
 * @route   GET /api/user/payments/:id/status
 * @desc    Get payment status
 * @access  Private (User only)
 * @param   id - Payment ID
 */
router.get('/payments/:id/status',
  userController.validatePaymentIdParam,
  userController.handleValidationErrors,
  userController.getPaymentStatus
);

/**
 * PAYMENT ROUTES
 */

/**
 * @route   GET /api/user/payments
 * @desc    Get user's payments
 * @access  Private (User only)
 * @note    RLS enforces user only sees their own payments
 */
router.get('/payments',
  userController.getPayments
);

/**
 * @route   POST /api/user/payments
 * @desc    Create payment record
 * @access  Private (User only)
 * @body    { training_id, amount, payment_method, transaction_reference? }
 * @note    RLS enforces payment is created for current user only
 */
router.post('/payments',
  userController.validatePaymentCreation,
  userController.handleValidationErrors,
  userController.createPayment
);

/**
 * CERTIFICATE ROUTES
 */

/**
 * @route   GET /api/user/certificates
 * @desc    Get user's certificates
 * @access  Private (User only)
 * @note    RLS enforces user only sees their own certificates
 */
router.get('/certificates',
  userController.getCertificates
);

/**
 * DASHBOARD ROUTE
 */

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard data (summary)
 * @access  Private (User only)
 * @returns Summary of enrollments, payments, certificates
 */
router.get('/dashboard',
  userController.getDashboard
);

/**
 * CATCH ALL - 404 handler for undefined user routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'User route not found',
    path: req.originalUrl
  });
});

module.exports = router;