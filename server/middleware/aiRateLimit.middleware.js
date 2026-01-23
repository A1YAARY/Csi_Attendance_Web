const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Enhanced AI-specific rate limiter with proper IPv6 handling
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  // Dynamic limit based on user type
  limit: (req, res) => {
    if (req.user?.organizationId) {
      return 50; // Higher limit for authenticated organization users
    }
    return 10; // Lower limit for unauthenticated users
  },

  message: {
    success: false,
    message: "AI request limit exceeded. Please try again after 15 minutes.",
    retryAfter: 15 * 60,
  },

  standardHeaders: "draft-8",
  legacyHeaders: false,

  // FIXED: Proper keyGenerator with IPv6 support
  keyGenerator: (req, res) => {
    // Priority 1: Organization + User based limiting
    if (req.user?.organizationId && req.user?._id) {
      const orgId =
        typeof req.user.organizationId === "object"
          ? req.user.organizationId._id || req.user.organizationId.id
          : req.user.organizationId;
      return `ai:org:${orgId}:user:${req.user._id}`;
    }

    // Priority 2: IP-based with proper IPv6 handling
    return `ai:ip:${ipKeyGenerator(req.ip)}`;
  },

  // Enhanced skip logic
  skip: (req, res) => {
    // Skip for health checks
    if (req.path === "/health") return true;

    // Skip for admin users (optional)
    if (req.user?.role === "admin") return true;

    return false;
  },

  // Detailed logging and response
  handler: (req, res, next, options) => {
    const userInfo = req.user
      ? `${req.user.email} (${req.user._id})`
      : `IP: ${req.ip}`;

    console.warn(`🚫 AI Rate limit exceeded for: ${userInfo}`);
    console.warn(`📊 Request details: ${req.method} ${req.path}`);

    res.status(429).json({
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many AI requests. Please wait before trying again.",
      retryAfter: options.message.retryAfter,
      timestamp: new Date().toISOString(),
      resetTime: new Date(Date.now() + options.windowMs).toISOString(),
      suggestions: [
        "Wait for the rate limit to reset",
        "Consider optimizing your queries to reduce frequency",
      ],
    });
  },
});


const aiInfoRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Higher limit for info endpoints
  message: {
    success: false,
    message: "Info request limit exceeded. Please try again after 15 minutes.",
  },
});

module.exports = { aiRateLimit, aiInfoRateLimit };
