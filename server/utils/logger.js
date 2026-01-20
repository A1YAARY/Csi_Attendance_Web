const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");

let logger;

try {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log("✅ Created logs directory:", logsDir);
  }

  logger = createLogger({
    level: "info",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
    ),
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), format.simple()),
      }),
      new transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
      }),
      new transports.File({ filename: path.join(logsDir, "combined.log") }),
    ],
    exceptionHandlers: [
      new transports.File({ filename: path.join(logsDir, "exceptions.log") }),
    ],
  });
} catch (error) {
  console.error("Error creating logger:", error);
  // Fallback: basic console logger with ALL required methods
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    http: console.log, // Missing method that caused the crash!
    verbose: console.log,
    silly: console.log,
  };
}

module.exports = logger;
