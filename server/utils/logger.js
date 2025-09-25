const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

let logger;

try {
  logger = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), format.simple())
      }),
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' })
    ],
    exceptionHandlers: [
      new transports.File({ filename: 'logs/exceptions.log' })
    ]
  });
} catch (error) {
  console.error('Error creating logger:', error);
  // Fallback: basic console logger
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
  };
}

module.exports = logger;
