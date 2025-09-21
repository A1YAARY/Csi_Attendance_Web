const { getAIAgent } = require("../utils/aiAgent");

const processAIQuery = async (req, res) => {
  try {
    const { question } = req.body; // Removed generateAudio parameter

    // Extract organization ID
    let organizationId;
    if (req.user.organizationId) {
      if (
        typeof req.user.organizationId === "object" &&
        req.user.organizationId._id
      ) {
        organizationId = req.user.organizationId._id.toString();
      } else if (
        typeof req.user.organizationId === "object" &&
        req.user.organizationId.id
      ) {
        organizationId = req.user.organizationId.id.toString();
      } else {
        organizationId = req.user.organizationId.toString();
      }
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Organization context missing. Please ensure you're logged in as an organization admin.",
      });
    }

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    console.log(`🤖 AI Query from ${req.user.email}: "${question}"`);

    // Get AI agent instance
    const aiAgent = await getAIAgent();

    // Process the query (no audio generation)
    const result = await aiAgent.query(question.trim(), organizationId);

    console.log(`✅ AI response generated for ${req.user.email}`);

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ AI Query processing failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process AI query. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAICapabilities = async (req, res) => {
  try {
    console.log(`📋 AI Capabilities request from ${req.user.email}`);

    const aiAgent = await getAIAgent();
    const capabilities = aiAgent.getCapabilities();

    return res.status(200).json({
      success: true,
      capabilities: capabilities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ AI Capabilities fetch failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AI capabilities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAIHealth = async (req, res) => {
  try {
    console.log(`🏥 AI Health check from ${req.user.email}`);

    const aiAgent = await getAIAgent();
    const health = aiAgent.getHealthStatus();

    const statusCode = health.status === "healthy" ? 200 : 503;

    return res.status(statusCode).json({
      success: health.status === "healthy",
      health: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ AI Health check failed:", error);
    return res.status(503).json({
      success: false,
      health: {
        status: "unhealthy",
        error: error.message,
        initialized: false,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  processAIQuery,
  getAICapabilities,
  getAIHealth,
};
