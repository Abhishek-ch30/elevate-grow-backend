const { body, param, query, validationResult } = require('express-validator');
const adminService = require('../services/admin.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Validation rules for user role update
 */
const validateUserRoleUpdate = [
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"'),
  
  body('is_admin')
    .optional()
    .isBoolean()
    .withMessage('is_admin must be a boolean value')
];

/**
 * Validation rules for training program creation
 */
const validateTrainingProgramCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('duration')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Duration cannot exceed 100 characters'),
  
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be 0 or greater'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

/**
 * Validation rules for training program update
 */
const validateTrainingProgramUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be less than 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('duration')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Duration cannot exceed 100 characters'),
  
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be 0 or greater'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

/**
 * Validation rules for enrollment status update
 */
const validateEnrollmentStatusUpdate = [
  body('status')
    .isIn(['pending_payment', 'enrolled', 'completed'])
    .withMessage('Status must be one of: pending_payment, enrolled, completed')
];

/**
 * Validation rules for payment status update
 */
const validatePaymentStatusUpdate = [
  body('status')
    .isIn(['pending_verification', 'verified', 'failed', 'refunded'])
    .withMessage('Status must be one of: pending_verification, verified, failed, refunded')
];

/**
 * Validation rules for contact message status update
 */
const validateContactMessageStatusUpdate = [
  body('status')
    .isIn(['new', 'read', 'replied', 'archived'])
    .withMessage('Status must be one of: new, read, replied, archived')
];

/**
 * Validation rules for certificate creation
 */
const validateCertificateCreation = [
  body('user_id')
    .isUUID()
    .withMessage('Valid user ID is required'),
  
  body('training_id')
    .isUUID()
    .withMessage('Valid training ID is required'),
  
  body('issue_date')
    .isDate()
    .withMessage('Valid issue date is required (YYYY-MM-DD format)'),
  
  body('file_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('File URL must be a valid URL')
];

/**
 * Validation rules for UUID parameters
 */
const validateUUIDParam = [
  param('id')
    .isUUID()
    .withMessage('Valid ID is required')
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
 * Get all users
 * GET /api/admin/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const filters = {
    role: req.query.role,
    profession: req.query.profession,
    search: req.query.search
  };
  
  const users = await adminService.getAllUsers(adminId, adminRole, filters);
  
  res.status(200).json({
    status: 'success',
    data: {
      users: users,
      count: users.length
    }
  });
});

/**
 * Get user by ID
 * GET /api/admin/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const userId = req.params.id;
  
  const user = await adminService.getUserById(adminId, adminRole, userId);
  
  res.status(200).json({
    status: 'success',
    data: {
      user: user
    }
  });
});

/**
 * Update user role/admin status
 * PUT /api/admin/users/:id/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const userId = req.params.id;
  
  const roleData = {
    role: req.body.role,
    is_admin: req.body.is_admin
  };
  
  const updatedUser = await adminService.updateUserRole(adminId, adminRole, userId, roleData);
  
  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    data: {
      user: updatedUser
    }
  });
});

/**
 * Get all training programs
 * GET /api/admin/training-programs
 */
const getAllTrainingPrograms = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const programs = await adminService.getAllTrainingPrograms(adminId, adminRole);
  
  res.status(200).json({
    status: 'success',
    data: {
      programs: programs,
      count: programs.length
    }
  });
});

/**
 * Create training program
 * POST /api/admin/training-programs
 */
const createTrainingProgram = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const programData = {
    title: req.body.title,
    description: req.body.description,
    duration: req.body.duration,
    price: req.body.price,
    is_active: req.body.is_active
  };
  
  const program = await adminService.createTrainingProgram(adminId, adminRole, programData);
  
  res.status(201).json({
    status: 'success',
    message: 'Training program created successfully',
    data: {
      program: program
    }
  });
});

/**
 * Update training program
 * PUT /api/admin/training-programs/:id
 */
const updateTrainingProgram = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const programId = req.params.id;
  
  const updateData = {
    title: req.body.title,
    description: req.body.description,
    duration: req.body.duration,
    price: req.body.price,
    is_active: req.body.is_active
  };
  
  const program = await adminService.updateTrainingProgram(adminId, adminRole, programId, updateData);
  
  res.status(200).json({
    status: 'success',
    message: 'Training program updated successfully',
    data: {
      program: program
    }
  });
});

/**
 * Delete training program
 * DELETE /api/admin/training-programs/:id
 */
const deleteTrainingProgram = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const programId = req.params.id;
  
  const program = await adminService.deleteTrainingProgram(adminId, adminRole, programId);
  
  res.status(200).json({
    status: 'success',
    message: 'Training program deleted successfully',
    data: {
      program: program
    }
  });
});

/**
 * Get all enrollments
 * GET /api/admin/enrollments
 */
const getAllEnrollments = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const filters = {
    status: req.query.status,
    userId: req.query.userId
  };
  
  const enrollments = await adminService.getAllEnrollments(adminId, adminRole, filters);
  
  res.status(200).json({
    status: 'success',
    data: {
      enrollments: enrollments,
      count: enrollments.length
    }
  });
});

/**
 * Update enrollment status
 * PUT /api/admin/enrollments/:id/status
 */
const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const enrollmentId = req.params.id;
  const { status } = req.body;
  
  const enrollment = await adminService.updateEnrollmentStatus(adminId, adminRole, enrollmentId, status);
  
  res.status(200).json({
    status: 'success',
    message: 'Enrollment status updated successfully',
    data: {
      enrollment: enrollment
    }
  });
});

/**
 * Get all payments
 * GET /api/admin/payments
 */
const getAllPayments = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const filters = {
    status: req.query.status,
    userId: req.query.userId
  };
  
  const payments = await adminService.getAllPayments(adminId, adminRole, filters);
  
  res.status(200).json({
    status: 'success',
    data: {
      payments: payments,
      count: payments.length
    }
  });
});

/**
 * Update payment status
 * PUT /api/admin/payments/:id/status
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const paymentId = req.params.id;
  const { status } = req.body;
  
  const payment = await adminService.updatePaymentStatus(adminId, adminRole, paymentId, status);
  
  res.status(200).json({
    status: 'success',
    message: 'Payment status updated successfully',
    data: {
      payment: payment
    }
  });
});

/**
 * Create certificate
 * POST /api/admin/certificates
 */
const createCertificate = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const certificateData = {
    user_id: req.body.user_id,
    training_id: req.body.training_id,
    issue_date: req.body.issue_date,
    file_url: req.body.file_url
  };
  
  const certificate = await adminService.createCertificate(adminId, adminRole, certificateData);
  
  res.status(201).json({
    status: 'success',
    message: 'Certificate created successfully',
    data: {
      certificate: certificate
    }
  });
});

/**
 * Get all certificates
 * GET /api/admin/certificates
 */
const getAllCertificates = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const filters = {
    userId: req.query.userId,
    trainingId: req.query.trainingId
  };
  
  const certificates = await adminService.getAllCertificates(adminId, adminRole, filters);
  
  res.status(200).json({
    status: 'success',
    data: {
      certificates: certificates,
      count: certificates.length
    }
  });
});

/**
 * Get admin activity logs
 * GET /api/admin/activity-logs
 */
const getActivityLogs = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const filters = {
    adminId: req.query.adminId,
    action: req.query.action
  };
  
  const logs = await adminService.getAdminActivityLogs(adminId, adminRole, filters);
  
  res.status(200).json({
    status: 'success',
    data: {
      logs: logs,
      count: logs.length
    }
  });
});

/**
 * Get admin dashboard data
 * GET /api/admin/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  // Get summary data from multiple sources
  const [users, programs, enrollments, payments, certificates] = await Promise.all([
    adminService.getAllUsers(adminId, adminRole),
    adminService.getAllTrainingPrograms(adminId, adminRole),
    adminService.getAllEnrollments(adminId, adminRole),
    adminService.getAllPayments(adminId, adminRole),
    adminService.getAllCertificates(adminId, adminRole)
  ]);
  
  const dashboard = {
    stats: {
      total_users: users.length,
      total_admins: users.filter(u => u.role === 'admin').length,
      total_programs: programs.length,
      active_programs: programs.filter(p => p.is_active).length,
      total_enrollments: enrollments.length,
      pending_payments: payments.filter(p => p.status === 'pending_verification').length,
      total_certificates: certificates.length
    },
    recent_users: users.slice(0, 10),
    recent_enrollments: enrollments.slice(0, 10),
    recent_payments: payments.slice(0, 10)
  };
  
  res.status(200).json({
    status: 'success',
    data: {
      dashboard: dashboard
    }
  });
});

/**
 * Get all contact messages
 * GET /api/admin/contact-messages
 */
const getAllContactMessages = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  
  const filters = {
    status: req.query.status,
    search: req.query.search
  };
  
  const messages = await adminService.getAllContactMessages(adminId, adminRole, filters);
  
  res.status(200).json({
    status: 'success',
    data: {
      messages: messages,
      count: messages.length
    }
  });
});

/**
 * Update contact message status
 * PUT /api/admin/contact-messages/:id/status
 */
const updateContactMessageStatus = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const adminRole = req.user.role;
  const messageId = req.params.id;
  const { status } = req.body;
  
  const message = await adminService.updateContactMessageStatus(adminId, adminRole, messageId, status);
  
  res.status(200).json({
    status: 'success',
    message: 'Contact message status updated successfully',
    data: {
      message: message
    }
  });
});

module.exports = {
  // Validation middleware
  validateUserRoleUpdate,
  validateTrainingProgramCreation,
  validateTrainingProgramUpdate,
  validateEnrollmentStatusUpdate,
  validatePaymentStatusUpdate,
  validateCertificateCreation,
  validateContactMessageStatusUpdate,
  validateUUIDParam,
  handleValidationErrors,
  
  // Controllers
  getAllUsers,
  getUserById,
  updateUserRole,
  getAllTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
  getAllEnrollments,
  updateEnrollmentStatus,
  getAllPayments,
  updatePaymentStatus,
  createCertificate,
  getAllCertificates,
  getActivityLogs,
  getDashboard,
  getAllContactMessages,
  updateContactMessageStatus
};