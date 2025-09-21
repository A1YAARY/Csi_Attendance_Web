const rateLimit = require("express-rate-limit");

// Enhanced rate limiting with user-based limits
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req, res) => {
    // Different limits based on user type or plan
    if (req.user?.isPremium) return 200;
    if (req.user?.role === "organization") return 100;
    return 50;
  },
  message: {
    success: false,
    error: "Too many AI requests from this user",
    retryAfter: "Please try again in 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    if (req.user?._id) {
      return `ai_${req.user._id.toString()}`;
    }
    return `ai_${req.ip}`;
  },
  handler: (req, res) => {
    console.log(
      `🚨 AI Rate limit exceeded for user: ${req.user?.email || req.ip}`
    );
    res.status(429).json({
      success: false,
      error: "Too many AI requests",
      message: "You've exceeded the AI query limit. Please try again later.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
      currentUsage: req.rateLimit.current,
      maxAllowed: req.rateLimit.limit,
    });
  },
});

// Lighter rate limiting for info endpoints
const aiInfoRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 requests per 5 minutes
  message: {
    success: false,
    error: "Too many requests for AI info",
  },
  keyGenerator: (req) => {
    if (req.user?._id) {
      return `info_${req.user._id.toString()}`;
    }
    return `info_${req.ip}`;
  },
});

module.exports = {
  aiRateLimit,
  aiInfoRateLimit,
};
