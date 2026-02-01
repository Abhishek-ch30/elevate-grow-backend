const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/auth.controller');
const publicController = require('../controllers/public.controller');

// Import middleware
const { authenticateToken, validateAdminSignupSecret } = require('../middleware/auth.middleware');
const { httpLogger } = require('../utils/logger');

// Apply HTTP logging to all routes
router.use(httpLogger);

/**
 * PUBLIC ROUTES - No authentication required
 */

/**
 * @route   POST /api/signup
 * @desc    Register a new user (role='user', is_admin=false)
 * @access  Public
 * @body    { full_name, email, password, phone?, profession?, college?, company? }
 * 
 * CRITICAL: Client CANNOT set role or is_admin - enforced by controller
 */
router.post('/signup',
  authController.validateUserSignup,
  authController.handleValidationErrors,
  authController.userSignup
);

/**
 * @route   POST /api/login
 * @desc    Login user or admin
 * @access  Public
 * @body    { email, password }
 * @returns { user: {...}, token: "..." }
 */
router.post('/login',
  authController.validateLogin,
  authController.handleValidationErrors,
  authController.login
);

/**
 * @route   POST /api/logout
 * @desc    Logout (client-side token invalidation)
 * @access  Public
 * @note    JWT logout is handled client-side by removing token
 */
router.post('/logout',
  authController.logout
);

/**
 * @route   POST /api/contact
 * @desc    Submit contact form message
 * @access  Public
 * @body    { full_name, email, subject, message }
 */
router.post('/contact',
  publicController.validateContactForm,
  publicController.handleValidationErrors,
  publicController.submitContactForm
);

/**
 * TOKEN VERIFICATION ROUTES
 */

/**
 * @route   GET /api/verify-token
 * @desc    Verify JWT token validity
 * @access  Private (requires valid token)
 * @headers Authorization: Bearer <token>
 */
router.get('/verify-token',
  authenticateToken,
  authController.verifyToken
);

/**
 * @route   POST /api/refresh-token
 * @desc    Refresh JWT token
 * @access  Private (requires valid token)
 * @headers Authorization: Bearer <token>
 */
router.post('/refresh-token',
  authenticateToken,
  authController.refreshToken
);

/**
 * HEALTH CHECK AND INFO ROUTES
 */

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * @route   GET /api
 * @desc    API root endpoint with documentation
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'QThink Solutions API',
    version: '1.0.0',
    description: 'Production-grade backend with RBAC and PostgreSQL RLS',
    documentation: {
      health: '/api/health',
      info: '/api/info',
      endpoints: {
        public: [
          'POST /api/signup - User registration',
          'POST /api/login - User/Admin login',
          'POST /api/logout - Logout',
          'POST /api/contact - Contact form submission',
          'GET /api/health - Health check',
          'GET /api/info - Detailed API information',
          'GET /api/training-programs - Available training programs',
          'GET /api/training-programs/:id - Training program details'
        ],
        protected: [
          'POST /api/admin/signup - Admin registration (requires secret)',
          'GET /api/verify-token - Token verification',
          'POST /api/refresh-token - Token refresh',
          'GET /api/user/* - User endpoints (requires authentication)',
          'GET /api/admin/* - Admin endpoints (requires admin role)'
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/info
 * @desc    API information
 * @access  Public
 */
router.get('/info', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      name: 'ElevateGrow Backend API',
      version: '1.0.0',
      description: 'Production-grade backend with RBAC and PostgreSQL RLS',
      environment: process.env.NODE_ENV,
      security_features: [
        'JWT Authentication',
        'Role-Based Access Control (RBAC)',
        'PostgreSQL Row Level Security (RLS)',
        'Request Rate Limiting',
        'Input Validation',
        'Security Headers'
      ],
      endpoints: {
        public: [
          'POST /api/signup - User registration',
          'POST /api/login - User/Admin login',
          'POST /api/logout - Logout',
          'GET /api/health - Health check',
          'GET /api/info - API information'
        ],
        protected: [
          'POST /api/admin/signup - Admin registration (requires secret)',
          'GET /api/verify-token - Token verification',
          'POST /api/refresh-token - Token refresh'
        ]
      }
    }
  });
});

/**
 * @route   GET /api/training-programs
 * @desc    Get available training programs (public access)
 * @access  Public
 * @note    Returns only active training programs for public viewing
 */
router.get('/training-programs', async (req, res) => {
  try {
    const { prisma } = require('../db/prisma');
    
    const programs = await prisma.trainingProgram.findMany({
      where: { is_active: true },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        price: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      data: {
        programs: programs
      }
    });
  } catch (error) {
    console.error('Error fetching public training programs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch training programs'
    });
  }
});

/**
 * @route   GET /api/training-programs/:id
 * @desc    Get single training program details (public access)
 * @access  Public
 * @param   id - Training program UUID
 */
router.get('/training-programs/:id', async (req, res) => {
  try {
    const { prisma } = require('../db/prisma');
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid training program ID format'
      });
    }

    const program = await prisma.trainingProgram.findFirst({
      where: {
        id: id,
        is_active: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        price: true,
        created_at: true
      }
    });

    if (!program) {
      return res.status(404).json({
        status: 'error',
        message: 'Training program not found or not active'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        program: program
      }
    });
  } catch (error) {
    console.error('Error fetching public training program details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch training program details'
    });
  }
});

/**
 * CATCH ALL - 404 handler for undefined public routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Public route not found',
    path: req.originalUrl
  });
});

module.exports = router;