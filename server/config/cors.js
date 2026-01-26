// File: config/cors.js

const cors = require("cors");

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
  "http://localhost:5173",
  "https://backend-attendance.csiace.com"
    ];

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      // Minor: Enhanced log for debugging (no ApiError needed as this is CORS callback)
      console.error(
        `❌ CORS error: Origin ${origin} not allowed by policy. Allowed:`,
        allowedOrigins,
      );
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },

  credentials: true,
  optionsSuccessStatus: 200,
  // ✅ FIXED: Added PATCH method
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-HTTP-Method-Override",
    "X-Device-ID",
    "X-Device-Fingerprint",
  ],
};

module.exports = cors(corsOptions);
