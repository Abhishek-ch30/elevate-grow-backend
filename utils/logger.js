const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  }),
  
  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// HTTP request logging middleware
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    const level = res.statusCode >= 400 ? 'error' : 'http';
    logger.log(level, `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, logData);
  });
  
  next();
};

// Security event logging
const logSecurityEvent = (event, details, req = null) => {
  const securityLog = {
    event,
    details,
    timestamp: new Date().toISOString(),
    ip: req ? (req.ip || req.connection.remoteAddress) : null,
    userAgent: req ? req.get('User-Agent') : null
  };
  
  logger.warn(`SECURITY EVENT: ${event}`, securityLog);
};

// Authentication event logging
const logAuthEvent = (event, userId, details = {}) => {
  const authLog = {
    event,
    userId,
    details,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`AUTH EVENT: ${event}`, authLog);
};

// Database query logging (for development)
const logDatabaseQuery = (query, params, duration) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`DB Query: ${query.substring(0, 100)}... (${duration}ms)`, {
      query: query.length > 100 ? query.substring(0, 100) + '...' : query,
      params: params ? params.length : 0,
      duration
    });
  }
};

// Error logging with stack trace
const logError = (error, context = {}) => {
  logger.error(`Error: ${error.message}`, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
};

module.exports = {
  logger,
  httpLogger,
  logSecurityEvent,
  logAuthEvent,
  logDatabaseQuery,
  logError,
  // Export winston logger methods
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger),
  http: logger.http.bind(logger)
};