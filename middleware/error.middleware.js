const { logError, logSecurityEvent } = require('../utils/logger');

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    user: req.user ? { id: req.user.id, role: req.user.role } : null
  });

  // Default error response
  let status = 500;
  let message = 'Internal server error';

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';

    // If it's express-validator error
    if (err.errors && Array.isArray(err.errors)) {
      message = err.errors.map(error => error.msg).join(', ');
    }
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid data format';
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    status = 409;
    message = 'Resource already exists';

    if (err.constraint && err.constraint.includes('email')) {
      message = 'Email already exists';
    }
  }

  if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    status = 400;
    message = 'Referenced resource does not exist';
  }

  if (err.code === '23502') { // PostgreSQL not null constraint violation
    status = 400;
    message = 'Required field missing';
  }

  if (err.code === '42501') { // PostgreSQL insufficient privilege (RLS violation)
    status = 403;
    message = 'Access denied';
    logSecurityEvent('RLS_VIOLATION', {
      error: err.message,
      detail: err.detail
    }, req);
  }

  // JWT related errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Authentication token expired';
  }

  if (err.message === 'Invalid email or password') {
    status = 401;
    message = 'Invalid email or password';
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    status = 429;
    message = 'Too many requests';
  }

  // Syntax errors (malformed JSON, etc.)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400;
    message = `Invalid JSON format: ${err.message}`;
  }

  // Don't expose error details in production
  const response = {
    status: 'error',
    message
  };

  // Add error details in development
  // if (process.env.NODE_ENV !== 'production') {
  response.details = {
    name: err.name,
    message: err.message,
    stack: err.stack
  };
  // }

  res.status(status).json(response);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch and forward errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request validation error formatter
 * For express-validator errors
 */
const validationErrorHandler = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Security error handler
 * Handles security-related errors with additional logging
 */
const securityErrorHandler = (err, req, res, next) => {
  const securityErrors = [
    'EBADCSRFTOKEN',
    'LIMIT_FILE_SIZE',
    'LIMIT_UNEXPECTED_FILE',
    'MALICIOUS_REQUEST'
  ];

  if (securityErrors.some(code => err.code === code || err.message.includes(code))) {
    logSecurityEvent('SECURITY_ERROR', {
      error: err.message,
      code: err.code
    }, req);

    return res.status(400).json({
      status: 'error',
      message: 'Security violation detected'
    });
  }

  next(err);
};

/**
 * Database connection error handler
 */
const databaseErrorHandler = (err, req, res, next) => {
  // PostgreSQL connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    logError(err, { context: 'database_connection' });

    return res.status(503).json({
      status: 'error',
      message: 'Database service unavailable'
    });
  }

  // PostgreSQL query timeout
  if (err.code === 'QUERY_TIMEOUT') {
    return res.status(408).json({
      status: 'error',
      message: 'Database query timeout'
    });
  }

  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  securityErrorHandler,
  databaseErrorHandler
};