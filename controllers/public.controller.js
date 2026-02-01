const { body, validationResult } = require('express-validator');
const { prisma } = require('../db/prisma');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Validation rules for contact form submission
 */
const validateContactForm = [
  body('full_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required and must be less than 100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be less than 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message is required and must be less than 2000 characters')
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
 * Submit contact form
 * POST /api/public/contact
 */
const submitContactForm = asyncHandler(async (req, res) => {
  const { full_name, email, subject, message } = req.body;
  
  try {
    // Create contact message in database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        full_name,
        email,
        subject,
        message,
        status: 'new'
      }
    });
    
    // TODO: In a real application, you might want to:
    // 1. Send email notification to admin
    // 2. Send confirmation email to user
    // 3. Add to real-time notification system
    
    res.status(201).json({
      status: 'success',
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: {
        id: contactMessage.id,
        submitted_at: contactMessage.created_at
      }
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit contact form. Please try again.'
    });
  }
});

/**
 * Get public training programs (no authentication required)
 * GET /api/public/training-programs
 */
const getPublicTrainingPrograms = asyncHandler(async (req, res) => {
  try {
    const programs = await prisma.trainingProgram.findMany({
      where: {
        is_active: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        price: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        programs: programs,
        count: programs.length
      }
    });
  } catch (error) {
    console.error('Public training programs fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch training programs'
    });
  }
});

/**
 * Get single public training program by ID
 * GET /api/public/training-programs/:id
 */
const getPublicTrainingProgramById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
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
        created_at: true,
        updated_at: true
      }
    });
    
    if (!program) {
      return res.status(404).json({
        status: 'error',
        message: 'Training program not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        program: program
      }
    });
  } catch (error) {
    console.error('Public training program fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch training program'
    });
  }
});

module.exports = {
  // Validation middleware
  validateContactForm,
  handleValidationErrors,
  
  // Controllers
  submitContactForm,
  getPublicTrainingPrograms,
  getPublicTrainingProgramById
};