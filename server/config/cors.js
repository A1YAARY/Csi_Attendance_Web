// File: config/cors.js

const cors = require("cors");

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "*",
      "https://csi-attendance-frontend.onrender.com",
      "https://csi-attendance-web-1-40fy.onrender.com", 
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

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
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-HTTP-Method-Override",
    "X-Device-ID", // ✅ Already added this
    "X-Device-Fingerprint", // ✅ ADD THIS LINE - This is missing!
  ],
};

module.exports = cors(corsOptions);
