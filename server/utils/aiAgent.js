const { ChatGroq } = require('@langchain/groq');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { ApiError } = require('../utils/errorHandler'); // New import

let aiAgentInstance = null;
let capabilities = null;

// Initialize AI agent with Groq
async function getAIAgent() {
  if (aiAgentInstance) {
    return aiAgentInstance;
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new ApiError(500, 'AI service not configured', {
        code: 'AI_NOT_CONFIGURED',
        missing: ['GROQ_API_KEY'],
      });
    }

    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: 'llama3-8b-8192', // Or 'mixtral-8x7b-32768' for better reasoning
      temperature: 0.1, // Low for factual responses
      maxTokens: 1000,
    });

    // Prompt template for attendance queries
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an AI assistant for the CSI Attendance System. You help with:
- Attendance reports and summaries
- User management queries
- QR code explanations
- Organization settings
- Working hours and holidays

Use IST timezone (Asia/Kolkata). Base responses on provided data. Be concise and professional.
Context: {context}`],
      ['human', '{question}'],
    ]);

    const outputParser = new StringOutputParser();

    aiAgentInstance = {
      model,
      prompt,
      outputParser,
      chain: prompt.pipe(model).pipe(outputParser),

      // Process query with organization context
      async query(question, organizationId, context = {}) {
        if (!question || !organizationId) {
          throw new ApiError(400, 'Missing query or organization ID', {
            code: 'INVALID_AI_QUERY',
          });
        }

        try {
          const fullContext = {
            organizationId,
            ...context,
            timezone: 'Asia/Kolkata',
          };

          const result = await this.chain.invoke({
            question: question,
            context: JSON.stringify(fullContext),
          });

          return {
            success: true,
            answer: result.trim(),
            sources: ['AI Model', 'Organization Data'],
            confidence: 'high', // Can be dynamic based on model
          };
        } catch (error) {
          console.error('AI Query execution error:', error);
          throw new ApiError(503, 'AI processing failed', {
            code: 'AI_QUERY_FAILED',
            question: question.substring(0, 100) + '...',
            error: error.message,
          });
        }
      },

      // Get agent capabilities
      getCapabilities() {
        if (capabilities) return capabilities;

        capabilities = {
          supportedQueries: [
            'Attendance summaries',
            'User reports',
            'Holiday checks',
            'QR troubleshooting',
            'Working hours analysis',
          ],
          models: ['llama3-8b-8192'],
          maxTokens: 1000,
          temperature: 0.1,
          features: ['Contextual responses', 'IST timezone awareness', 'JSON context handling'],
        };

        return capabilities;
      },

      // Health check
      getHealthStatus() {
        try {
          // Simple ping or model readiness check
          return {
            status: 'healthy',
            initialized: !!aiAgentInstance,
            model: 'llama3-8b-8192',
            lastInit: new Date().toISOString(),
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error.message,
            initialized: false,
          };
        }
      },
    };

    return aiAgentInstance;
  } catch (error) {
    console.error('AI Agent initialization error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to initialize AI agent', {
      code: 'AI_INIT_FAILED',
      dependencies: ['GROQ_API_KEY', '@langchain/groq'],
    });
  }
}

// Reset agent (for testing/reload)
function resetAIAgent() {
  aiAgentInstance = null;
  capabilities = null;
}

module.exports = {
  getAIAgent,
  resetAIAgent,
};
