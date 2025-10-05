const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const { ApiError } = require("../utils/errorHandler"); // New import

// More reasonable limit for production: 1 request per 3 seconds
const qrRateLimiter = rateLimit({
  windowMs: 3 * 1000, // 3 seconds
  max: 1,
  keyGenerator: (req, res) => {
    return req.user ? req.user._id.toString() : ipKeyGenerator(req);
  },

  // Custom handler to throw ApiError
  handler: (req, res, next, optionsUsed) => {
    throw new ApiError(429, "Too many scans! Please wait before scanning again.", {
      success: false,
      retryAfter: 3,
      code: "QR_RATE_LIMIT_EXCEEDED"
    });
  },

  message: {
    success: false,
    message: "Too many scans! Please wait before scanning again.",
    retryAfter: 3,
  },

  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = qrRateLimiter;
