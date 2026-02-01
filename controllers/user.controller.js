const { body, param, query, validationResult } = require('express-validator');
const userService = require('../services/user.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Validation rules for profile update
 */
const validateProfileUpdate = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isNumeric()
    .withMessage('Phone number must be numeric'),
  
  body('profession')
    .optional()
    .isIn(['student', 'professional'])
    .withMessage('Profession must be either "student" or "professional"'),
  
  body('college')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('College name cannot exceed 200 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters')
];

/**
 * Validation rules for enrollment creation
 */
const validateEnrollmentCreation = [
  body('training_id')
    .isUUID()
    .withMessage('Valid training ID is required')
];

/**
 * Validation rules for enrollment creation with details
 */
const validateEnrollmentWithDetails = [
  body('training_id')
    .isUUID()
    .withMessage('Valid training ID is required'),
  
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian phone number is required')
];

/**
 * Validation rules for enrollment ID parameter
 */
const validateEnrollmentIdParam = [
  param('id')
    .isUUID()
    .withMessage('Valid enrollment ID is required')
];

/**
 * Validation rules for payment ID parameter
 */
const validatePaymentIdParam = [
  param('id')
    .isUUID()
    .withMessage('Valid payment ID is required')
];

/**
 * Validation rules for payment creation
 */
const validatePaymentCreation = [
  body('training_id')
    .isUUID()
    .withMessage('Valid training ID is required'),
  
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('payment_method')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Payment method is required and must be less than 50 characters'),
  
  body('transaction_reference')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Transaction reference cannot exceed 200 characters')
];

/**
 * Validation rules for training program ID parameter
 */
const validateTrainingIdParam = [
  param('id')
    .isUUID()
    .withMessage('Valid training program ID is required')
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Get user profile
 * GET /api/user/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const profile = await userService.getUserProfile(userId, userRole);
  
  res.status(200).json({
    status: 'success',
    data: {
      profile: profile
    }
  });
});

/**
 * Update user profile
 * PUT /api/user/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Ensure client cannot modify protected fields
  const allowedFields = ['full_name', 'phone', 'profession', 'college', 'company'];
  const updateData = {};
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });
  
  const updatedProfile = await userService.updateUserProfile(userId, userRole, updateData);
  
  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      profile: updatedProfile
    }
  });
});

/**
 * Get user enrollments
 * GET /api/user/enrollments
 */
const getEnrollments = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const enrollments = await userService.getUserEnrollments(userId, userRole);
  
  res.status(200).json({
    status: 'success',
    data: {
      enrollments: enrollments
    }
  });
});

/**
 * Create new enrollment
 * POST /api/user/enrollments
 */
const createEnrollment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { training_id } = req.body;
  
  const enrollment = await userService.createEnrollment(userId, userRole, training_id);
  
  res.status(201).json({
    status: 'success',
    message: 'Enrollment created successfully',
    data: {
      enrollment: enrollment
    }
  });
});

/**
 * Create new enrollment with user details
 * POST /api/user/enrollments
 */
const createEnrollmentWithDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { training_id, full_name, email, phone } = req.body;
  
  // Update user profile with provided details if they differ
  const profileData = { full_name, phone };
  if (req.user.email !== email) {
    return res.status(400).json({
      status: 'error',
      message: 'Email must match your account email'
    });
  }
  
  const enrollment = await userService.createEnrollmentWithDetails(
    userId,
    userRole,
    training_id,
    profileData
  );
  
  res.status(201).json({
    status: 'success',
    message: 'Enrollment created successfully',
    data: {
      enrollment: enrollment
    }
  });
});

/**
 * Initiate UPI payment for enrollment
 * POST /api/user/enrollments/:id/payment/initiate
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const enrollmentId = req.params.id;
  
  const paymentSession = await userService.initiatePaymentForEnrollment(
    userId,
    userRole,
    enrollmentId
  );
  
  res.status(201).json({
    status: 'success',
    message: 'Payment session initiated',
    data: {
      payment_session: paymentSession
    }
  });
});

/**
 * Confirm payment completion
 * POST /api/user/payments/:id/confirm
 */
const confirmPayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const paymentId = req.params.id;
  const { transaction_reference } = req.body;
  
  const payment = await userService.confirmPayment(
    userId,
    userRole,
    paymentId,
    transaction_reference
  );
  
  res.status(200).json({
    status: 'success',
    message: 'Payment confirmation recorded',
    data: {
      payment: payment
    }
  });
});

/**
 * Get payment status
 * GET /api/user/payments/:id/status
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const paymentId = req.params.id;
  
  const paymentStatus = await userService.getPaymentStatus(userId, userRole, paymentId);
  
  res.status(200).json({
    status: 'success',
    data: {
      payment_status: paymentStatus
    }
  });
});

/**
 * Get user payments
 * GET /api/user/payments
 */
const getPayments = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const payments = await userService.getUserPayments(userId, userRole);
  
  res.status(200).json({
    status: 'success',
    data: {
      payments: payments
    }
  });
});

/**
 * Create payment record
 * POST /api/user/payments
 */
const createPayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const paymentData = {
    training_id: req.body.training_id,
    amount: req.body.amount,
    payment_method: req.body.payment_method,
    transaction_reference: req.body.transaction_reference
  };
  
  const payment = await userService.createPayment(userId, userRole, paymentData);
  
  res.status(201).json({
    status: 'success',
    message: 'Payment record created successfully',
    data: {
      payment: payment
    }
  });
});

/**
 * Get user certificates
 * GET /api/user/certificates
 */
const getCertificates = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const certificates = await userService.getUserCertificates(userId, userRole);
  
  res.status(200).json({
    status: 'success',
    data: {
      certificates: certificates
    }
  });
});

/**
 * Get available training programs
 * GET /api/user/training-programs
 */
const getTrainingPrograms = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const programs = await userService.getAvailableTrainingPrograms(userId, userRole);
  
  res.status(200).json({
    status: 'success',
    data: {
      programs: programs
    }
  });
});

/**
 * Get single training program details
 * GET /api/user/training-programs/:id
 */
const getTrainingProgramDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const trainingId = req.params.id;
  
  const program = await userService.getTrainingProgramDetails(userId, userRole, trainingId);
  
  res.status(200).json({
    status: 'success',
    data: {
      program: program
    }
  });
});

/**
 * Get user dashboard data (summary)
 * GET /api/user/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Get summary data from multiple sources
  const [enrollments, payments, certificates] = await Promise.all([
    userService.getUserEnrollments(userId, userRole),
    userService.getUserPayments(userId, userRole),
    userService.getUserCertificates(userId, userRole)
  ]);
  
  const dashboard = {
    stats: {
      total_enrollments: enrollments.length,
      completed_programs: enrollments.filter(e => e.status === 'completed').length,
      pending_payments: payments.filter(p => p.status === 'pending_verification').length,
      total_certificates: certificates.length
    },
    recent_enrollments: enrollments.slice(0, 5),
    recent_payments: payments.slice(0, 5),
    recent_certificates: certificates.slice(0, 5)
  };
  
  res.status(200).json({
    status: 'success',
    data: {
      dashboard: dashboard
    }
  });
});

module.exports = {
  // Validation middleware
  validateProfileUpdate,
  validateEnrollmentCreation,
  validateEnrollmentWithDetails,
  validateEnrollmentIdParam,
  validatePaymentIdParam,
  validatePaymentCreation,
  validateTrainingIdParam,
  handleValidationErrors,
  
  // Controllers
  getProfile,
  updateProfile,
  getEnrollments,
  createEnrollment,
  createEnrollmentWithDetails,
  initiatePayment,
  confirmPayment,
  getPaymentStatus,
  getPayments,
  createPayment,
  getCertificates,
  getTrainingPrograms,
  getTrainingProgramDetails,
  getDashboard
};