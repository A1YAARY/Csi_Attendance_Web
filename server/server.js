require("dotenv").config();
const path = require("path");
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { connectDB, closeDB } = require("./config/Database");
const customCors = require("./config/cors");
const ScheduleAttendanceCheck = require("./utils/timeRefresher");
const logger = require("./utils/logger");

// Routes
const bulkUserRoutes = require("./routes/bulkUser.routes");
const aiAnalyticsRoutes = require("./routes/aiAnalytics.routes");
const authRoutes = require("./routes/auth.routes");
const qrcodeRoutes = require("./routes/qrcode.routes");
const attendanceRoutes = require("./routes/Attendance.routes");
const adminRoutes = require("./routes/admin.routes");
const passwordResetRoutes = require("./routes/resetPassword.routes");
const downloadroutes = require('./routes/download.routes')

const app = express();

// ✅ Proxy & cookies
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
// ✅ Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

// ✅ Logging
app.use(
  morgan("tiny", {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// ✅ Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

// ✅ Connect DB
connectDB();

// ✅ Middleware
app.use(customCors);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ Mount routes
app.use("/auth2", authRoutes);
app.use("/qrcode", qrcodeRoutes);
app.use("/attend", attendanceRoutes);
app.use("/admin", adminRoutes);
app.use("/password", passwordResetRoutes);
app.use("/bulk", bulkUserRoutes);
app.use("/api/ai-analytics", aiAnalyticsRoutes);
app.use("/getdata", downloadroutes)

// ✅ Health check
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
      ai: "/ai/*",
    },
  });
});

// ✅ Static audio serving
app.use("/api/audio", express.static(path.join(__dirname, "temp/audio")));

// ✅ Middleware error handler
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

// ✅ Catch-all 404
app.use(/.*/, (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 CSI Attendance Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`🤖 AI Analytics: http://localhost:${PORT}/ai`);
  console.log(`📋 Health Check: http://localhost:${PORT}/`);

  // ✅ Start cron jobs
  ScheduleAttendanceCheck();

  console.log("✅ All systems initialized successfully!");
});

// ✅ Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("✅ Server closed successfully");

    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }

  // Force exit after 30s
  setTimeout(() => {
    console.error("❌ Forced shutdown after 30 seconds");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
