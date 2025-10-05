const winston = require('winston');

// Custom logger with levels and colors
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
    ] : []),
  ],
});

// HTTP-specific logger (for Morgan integration)
logger.http = (message) => {
  logger.info(message, { level: 'http' });
};

// Convenience methods
logger.error = (message, meta) => logger.error({ message, ...meta });
logger.warn = (message, meta) => logger.warn({ message, ...meta });
logger.info = (message, meta) => logger.info({ message, ...meta });
logger.debug = (message, meta) => logger.debug({ message, ...meta });

module.exports = logger;
