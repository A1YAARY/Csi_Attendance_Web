require("dotenv").config();
// import 'dotenv/config';

const path = require("path");

const express = require("express");
const connectDB = require("./config/Database");
const customCors = require("./config/cors");
const ScheduleAttendanceCheck = require("./utils/timeRefresher");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const logger = require("./utils/logger");
const bulkUserRoutes = require("./routes/bulkUser.routes");
const cookieParser = require("cookie-parser");

// ✅ NEW: AI Analytics Routes Import
const aiAnalyticsRoutes = require("./routes/aiAnalytics.routes");

const app = express();

// ✅ CRITICAL FIX: Trust proxy for IPv6 rate limiting
app.set("trust proxy", 1);
app.use(cookieParser());

// Security & Performance Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Morgan + Winston (log HTTP requests)
app.use(
  morgan("tiny", {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// ✅ GLOBAL ERROR HANDLING (moved up before other middleware)
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

// Connect to database first
connectDB();

// Basic Middleware
app.use(customCors);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ EXISTING ROUTES
const authRoutes = require("./routes/auth.routes");
const qrcodeRoutes = require("./routes/qrcode.routes");
const attendanceRoutes = require("./routes/Attendance.routes");
const adminRoutes = require("./routes/admin.routes");
const passwordResetRoutes = require("./routes/resetPassword.routes");

// Mount existing routes
app.use("/auth2", authRoutes);
app.use("/qrcode", qrcodeRoutes);
app.use("/attend", attendanceRoutes);
app.use("/admin", adminRoutes);
app.use("/password", passwordResetRoutes);
app.use("/bulk", bulkUserRoutes);

// ✅ NEW: AI Analytics Routes
app.use("/api/ai-analytics", aiAnalyticsRoutes);

// ✅ ENHANCED Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "CSI Attendance Server is running!",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      attendance: "✅ Active",
      bulkImport: "✅ Active",
      aiAnalytics: "✅ Active",
      qrGeneration: "✅ Active",
      adminPanel: "✅ Active",
    },
    endpoints: {
      auth: "/auth2/*",
      qrcode: "/qrcode/*",
      attendance: "/attend/*",
      admin: "/admin/*",
      bulk: "/bulk/*",
      ai: "/ai/*", // NEW
    },
  });
});

// ✅ MIDDLEWARE ERROR HANDLER (before global error handler)
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    error: "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && {
      message: err.message,
      stack: err.stack,
    }),
  });
});
app.use('/api/audio', express.static(path.join(__dirname, 'temp/audio')));

// ✅ GLOBAL ERROR HANDLER (final catch-all)
app.use((error, req, res, next) => {
  console.error("❌ Global error handler:", error);
  res.status(500).json({
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
});

app.use("/*catchall", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "POST /auth2/login",
      "POST /attend/scan",
      "GET /admin/records",
      "POST /bulk/upload-users",
      "POST /ai/query",
    ],
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 CSI Attendance Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`🤖 AI Analytics: http://localhost:${PORT}/ai`);
  console.log(`📋 Health Check: http://localhost:${PORT}/`);

  // ✅ Initialize cron jobs
  ScheduleAttendanceCheck();

  console.log("✅ All systems initialized successfully!");
});

// ✅ GRACEFUL SHUTDOWN HANDLER
const gracefulShutdown = (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error("❌ Error during server shutdown:", err);
      process.exit(1);
    }

    console.log("✅ Server closed successfully");

    // Close database connection if needed
    const mongoose = require("mongoose");
    mongoose.connection.close(() => {
      console.log("✅ Database connection closed");
      process.exit(0);
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("❌ Forced shutdown after 30 seconds");
    process.exit(1);
  }, 30000);
};

// Listen for shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ✅ EXPORT FOR TESTING
module.exports = app;
