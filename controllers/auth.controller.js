const { body, validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Validation rules for user signup
 */
const validateUserSignup = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

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
 * Validation rules for admin signup
 */
const validateAdminSignup = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('adminSecret')
    .notEmpty()
    .withMessage('Admin signup secret is required')
];

/**
 * Validation rules for login
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
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
 * User signup controller
 * POST /api/signup
 */
const userSignup = asyncHandler(async (req, res) => {
  const { full_name, email, phone, profession, college, company, password } = req.body;

  // Ensure client cannot set role or is_admin
  delete req.body.role;
  delete req.body.is_admin;

  const result = await authService.userSignup({
    full_name,
    email,
    phone,
    profession,
    college,
    company,
    password
  });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: result.user,
      token: result.token
    }
  });
});



/**
 * Login controller (both user and admin)
 * POST /api/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: result.user,
      token: result.token
    }
  });
});

/**
 * Change password controller
 * POST /api/user/change-password or /api/admin/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const result = await authService.changePassword(userId, currentPassword, newPassword);

  res.status(200).json({
    status: 'success',
    message: result.message
  });
});

/**
 * Get current user profile
 * GET /api/user/profile or /api/admin/profile
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await authService.verifyUser(userId);

  res.status(200).json({
    status: 'success',
    data: {
      user: user
    }
  });
});

/**
 * Logout controller (client-side token invalidation)
 * POST /api/logout
 */
const logout = asyncHandler(async (req, res) => {
  // In JWT-based auth, logout is typically handled client-side
  // by removing the token from storage
  res.status(200).json({
    status: 'success',
    message: 'Logout successful'
  });
});

/**
 * Refresh token controller
 * POST /api/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await authService.verifyUser(userId);

  const { generateToken } = require('../utils/jwt');
  const newToken = generateToken({
    id: user.id,
    role: user.role,
    email: user.email,
    is_admin: user.is_admin
  });

  res.status(200).json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: {
      token: newToken,
      user: user
    }
  });
});

/**
 * Verify token controller
 * GET /api/verify-token
 */
const verifyToken = asyncHandler(async (req, res) => {
  // If middleware passes, token is valid
  res.status(200).json({
    status: 'success',
    message: 'Token is valid',
    data: {
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email,
        is_admin: req.user.is_admin
      }
    }
  });
});

module.exports = {
  // Validation middleware
  validateUserSignup,

  validateLogin,
  validatePasswordChange,
  handleValidationErrors,

  // Controllers
  userSignup,

  login,
  changePassword,
  getCurrentUser,
  logout,
  refreshToken,
  verifyToken
};