const express = require("express");
const router = express.Router();
const auth = require("../middleware/Auth.middleware");
const role = require("../middleware/role.middleware");
const {
  aiRateLimit,
  aiInfoRateLimit,
} = require("../middleware/aiRateLimit.middleware");
const aiAnalyticsController = require("../controllers/aiAnalytics.controller");

// AI query endpoint with enhanced security
router.post(
  "/query",
  auth,
  role(["organization"]),
  aiRateLimit,
  aiAnalyticsController.processAIQuery
);

// Get AI capabilities
router.get(
  "/capabilities",
  auth,
  role(["organization"]),
  aiInfoRateLimit,
  aiAnalyticsController.getAICapabilities
);

// Health check endpoint
router.get(
  "/health",
  auth,
  role(["organization"]),
  aiAnalyticsController.getAIHealth
);

module.exports = router;
