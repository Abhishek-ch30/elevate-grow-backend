require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const { connectDB } = require('./db/prisma');

// Import routes
const publicRoutes = require('./routes/public.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Load environment variables (Moved to top)


const app = express();
const PORT = process.env.PORT || 3001;
let server;
// Forced restart for route registration check

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'QThink Solutions Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start server
    server = app.listen(PORT, () => {
      console.log(`
  🚀 QThink Solutions Backend Server Started!
  
  🌐 Port:      ${PORT}
  📋 Mode:      ${process.env.NODE_ENV || 'development'}
  🔗 URL:       http://localhost:${PORT}
  💓 Health:    http://localhost:${PORT}/health
  
  🛡️  Security Features:
  ✅ CORS Enabled (${process.env.CORS_ORIGIN || 'http://localhost:5173'})
  ✅ Rate Limiting (${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/${process.env.RATE_LIMIT_WINDOW_MS ? Math.floor(process.env.RATE_LIMIT_WINDOW_MS / 60000) + 'min' : '15min'})
  ✅ Security Headers
  ✅ Request Logging

  📋 Available Endpoints:
  🌐 Public:    /api/signup, /api/login, /api/admin/signup
  👤 User:      /api/user/* (authenticated users)
  🔧 Admin:     /api/admin/* (admin users)
  💓 Health:    /health

  🎯 Ready to serve requests!
      `);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = (signal) => {
  logger.info(`🔄 Received ${signal}, starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('✅ HTTP server closed');

      // Close database connections
      const { gracefulShutdown: dbShutdown } = require('./db/prisma');
      dbShutdown().then(() => {
        logger.info('👋 Graceful shutdown completed');
        process.exit(0);
      }).catch((err) => {
        logger.error('❌ Error during graceful shutdown:', err);
        process.exit(1);
      });
    });
  } else {
    process.exit(0);
  }

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('⚠️  Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;