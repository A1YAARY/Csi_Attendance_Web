const { getAIAgent } = require("../utils/aiAgent");

const processAIQuery = async (req, res) => {
  try {
    const { question } = req.body;
    
    // 🔧 FIXED: Extract the actual ObjectId from the organization object
    let organizationId;
    if (req.user.organizationId) {
      // Handle both ObjectId and object cases
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        organizationId = req.user.organizationId._id.toString();
      } else if (typeof req.user.organizationId === 'object' && req.user.organizationId.id) {
        organizationId = req.user.organizationId.id.toString();
      } else {
        organizationId = req.user.organizationId.toString();
      }
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization context missing. Please ensure you're logged in as an organization admin.",
      });
    }

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    console.log(`🤖 AI Query from ${req.user.email} (Org: ${organizationId}): ${question}`);
    
    // Add performance timing
    const startTime = Date.now();
    
    const aiAgent = await getAIAgent();
    const response = await aiAgent.query(question, organizationId); // Pass clean ObjectId string
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ AI Response generated in ${processingTime}ms`);

    res.json({
      success: true,
      question: question,
      response: response,
      timestamp: new Date().toISOString(),
      user: req.user.email,
      organizationId: organizationId,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    console.error("AI Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "AI processing failed",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

const getAICapabilities = async (req, res) => {
  try {
    res.json({
      success: true,
      capabilities: [
        "📊 Real-time attendance summaries",
        "👤 Individual user attendance tracking", 
        "❌ Absent employee identification",
        "⏰ Late arrival detection",
        "📈 Attendance statistics and analytics",
        "🔍 Smart attendance queries",
        "📅 Date-specific attendance reports",
        "⚡ Cached responses for faster performance"
      ],
      examples: [
        "Show me today's attendance summary",
        "Who was absent today?",
        "Was john@example.com present today?",
        "Show me late arrivals today",
        "How many people are present today?",
        "Give me attendance statistics",
      ],
      features: [
        "Lightning-fast responses with caching",
        "Intelligent context understanding", 
        "Organization-specific data security",
        "Natural language processing",
        "Real-time data analysis"
      ],
      model: "Groq Llama 3.1 70B (Optimized)",
      version: "2.0.0"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to get AI capabilities" 
    });
  }
};

const getAIHealth = async (req, res) => {
  try {
    const aiAgent = await getAIAgent();
    const healthData = {
      success: true,
      status: aiAgent.isInitialized ? "healthy" : "initializing",
      timestamp: new Date().toISOString(),
      model: "groq-llama-3.1-70b-versatile",
      cacheSize: aiAgent.cache?.size || 0,
      uptime: process.uptime(),
      version: "2.0.0"
    };
    
    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  processAIQuery,
  getAICapabilities,
  getAIHealth,
};
