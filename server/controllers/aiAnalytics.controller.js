const { getAIAgent } = require("../utils/aiAgent");
const { handleAsync, ApiError } = require("../utils/errorHandler");

const processAIQuery = handleAsync(async (req, res) => {
  const { question } = req.body; // Removed generateAudio parameter

  //testing

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
    throw new ApiError(
      400,
      "Organization context missing. Please ensure you're logged in as an organization admin."
    );
  }

  if (!question || question.trim().length === 0) {
    throw new ApiError(400, "Question is required");
  }

  console.log(`🤖 AI Query from ${req.user.email}: "${question}"`);

  // Get AI agent instance
  const aiAgent = await getAIAgent();

  // Process the query (no audio generation)
  const result = await aiAgent.query(question.trim(), organizationId);

  console.log(`✅ AI response generated for ${req.user.email}`);

  return res.status(200).json(result);
});

const getAICapabilities = handleAsync(async (req, res) => {
  console.log(`📋 AI Capabilities request from ${req.user.email}`);

  const aiAgent = await getAIAgent();

  const capabilities = aiAgent.getCapabilities();

  return res.status(200).json({
    success: true,
    capabilities: capabilities,
    timestamp: new Date().toISOString(),
  });
});

const getAIHealth = handleAsync(async (req, res) => {
  console.log(`🏥 AI Health check from ${req.user.email}`);

  const aiAgent = await getAIAgent();

  const health = aiAgent.getHealthStatus();

  const statusCode = health.status === "healthy" ? 200 : 503;

  return res.status(statusCode).json({
    success: health.status === "healthy",
    health: health,
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  processAIQuery,
  getAICapabilities,
  getAIHealth,
};
