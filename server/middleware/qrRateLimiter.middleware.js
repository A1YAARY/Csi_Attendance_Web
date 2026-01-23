const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// More reasonable limit for production: 1 request per 3 seconds
const qrRateLimiter = rateLimit({
  windowMs: 3 * 1000, // 3 seconds
  max: 1,
  keyGenerator: (req, res) => {
    return req.user ? req.user._id.toString() : ipKeyGenerator(req);
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
