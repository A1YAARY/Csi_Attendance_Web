require("dotenv").config();
// import 'dotenv/config';


const mongoose = require("mongoose");
const { ChatGroq } = require("@langchain/groq");
const { AgentExecutor, createReactAgent } = require("langchain/agents");
const { DynamicTool } = require("@langchain/core/tools");
const { PromptTemplate } = require("@langchain/core/prompts");

class AttendanceAIAgent {
  constructor() {
    this.llm = null;
    this.executor = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Check for required environment variables
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is required for AI functionality");
      }

      // Use existing mongoose connection
      if (mongoose.connection.readyState !== 1) {
        console.log("⚠️ Waiting for MongoDB connection...");
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("MongoDB connection timeout")), 10000);
          mongoose.connection.on("connected", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      // Setup Groq LLM
      this.llm = new ChatGroq({
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.1,
        maxTokens: 1000,
      });

      // Create tools
      const tools = this.createTools();

      // Create prompt template
      const prompt = PromptTemplate.fromTemplate(`
You are an attendance analytics assistant for an organization.
You can ONLY access data from the requesting admin's organization.
Available tools: {tools}
Tool names: {tool_names}

Question: {input}
Think step by step and use the attendance_analytics tool to get data.

{agent_scratchpad}
`);

      // Create agent
      const agent = await createReactAgent({
        llm: this.llm,
        tools,
        prompt,
      });

      // Create agent executor
      this.executor = new AgentExecutor({
        agent,
        tools,
        verbose: process.env.NODE_ENV === "development",
        maxIterations: 3,
        handleParsingErrors: true,
      });

      this.isInitialized = true;
      console.log("✅ AI Agent initialized successfully");
    } catch (error) {
      console.error("❌ AI Agent initialization failed:", error);
      throw error;
    }
  }

  createTools() {
    return [
      new DynamicTool({
        name: "attendance_analytics",
        description: `Analyze attendance data. Supported query types:
- presence_check: Check if user was present on date (needs userEmail, date)
- daily_summary: Get attendance summary for date (needs date)
- weekly_summary: Get weekly stats (needs startDate, endDate)
- late_users: Find late users on date (needs date)
- absent_users: Find absent users on date (needs date)
- user_stats: Get user statistics (needs userEmail, startDate, endDate)

Input must be valid JSON with queryType and required fields.`,
        func: async (input) => {
          try {
            const params = JSON.parse(input);
            return await this.executeAnalytics(params);
          } catch (error) {
            console.error("Tool execution error:", error);
            return `Error processing request: ${error.message}`;
          }
        },
      }),
    ];
  }

  async executeAnalytics(params) {
    const { queryType, userEmail, date, startDate, endDate, organizationId } = params;
    
    if (!organizationId) {
      return "❌ Organization context required";
    }

    try {
      switch (queryType) {
        case "presence_check":
          return await this.checkPresence(userEmail, date, organizationId);
        case "daily_summary":
          return await this.getDailySummary(date, organizationId);
        case "weekly_summary":
          return await this.getWeeklySummary(startDate, endDate, organizationId);
        case "late_users":
          return await this.getLateUsers(date, organizationId);
        case "absent_users":
          return await this.getAbsentUsers(date, organizationId);
        case "user_stats":
          return await this.getUserStats(userEmail, startDate, endDate, organizationId);
        default:
          return "Unknown query type. Supported: presence_check, daily_summary, weekly_summary, late_users, absent_users, user_stats";
      }
    } catch (error) {
      console.error("Analytics execution error:", error);
      return `Database query error: ${error.message}`;
    }
  }

  async checkPresence(userEmail, date, organizationId) {
    const User = mongoose.model("User");
    const Attendance = mongoose.model("Attendance");

    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");

    const user = await User.findOne({
      email: userEmail,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    if (!user) {
      return `❌ User ${userEmail} not found in your organization`;
    }

    const attendance = await Attendance.findOne({
      userId: user._id,
      organizationId: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    return attendance
      ? `✅ ${user.name} was present on ${date}`
      : `❌ ${user.name} was absent on ${date}`;
  }

  async getDailySummary(date, organizationId) {
    const User = mongoose.model("User");
    const Attendance = mongoose.model("Attendance");

    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");

    const totalUsers = await User.countDocuments({
      role: "user",
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    const presentUsers = await Attendance.distinct("userId", {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const presentCount = presentUsers.length;
    const absentCount = totalUsers - presentCount;
    const presentPercent = totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0;

    return `📊 Daily Summary for ${date}:
• Present: ${presentCount}/${totalUsers} users (${presentPercent}%)
• Absent: ${absentCount} users`;
  }

  async getAbsentUsers(date, organizationId) {
    const User = mongoose.model("User");
    const Attendance = mongoose.model("Attendance");

    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");

    const presentUserIds = await Attendance.distinct("userId", {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const absentUsers = await User.find({
      _id: { $nin: presentUserIds },
      role: "user",
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).select("name email");

    if (absentUsers.length === 0) {
      return `✅ All users were present on ${date}`;
    }

    let result = `❌ Absent users on ${date}:\n`;
    absentUsers.forEach((user) => {
      result += `• ${user.name} (${user.email})\n`;
    });

    return result;
  }

  async getWeeklySummary(startDate, endDate, organizationId) {
    return `📈 Weekly summary from ${startDate} to ${endDate} - Feature coming soon for organization ${organizationId}`;
  }

  async getLateUsers(date, organizationId) {
    return `⏰ Late users analysis for ${date} - Feature coming soon for organization ${organizationId}`;
  }

  async getUserStats(userEmail, startDate, endDate, organizationId) {
    return `👤 User stats for ${userEmail} from ${startDate} to ${endDate} - Feature coming soon for organization ${organizationId}`;
  }

  async query(question, organizationId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!organizationId) {
      return "❌ Error: Organization context is required for security";
    }

    try {
      const result = await this.executor.invoke({
        input: question,
        organizationId: organizationId,
      });

      return result.output;
    } catch (error) {
      console.error("AI Agent query error:", error);
      return `❌ Error processing request: ${error.message}`;
    }
  }
}

// Singleton instance with proper cleanup
let aiAgent = null;

const getAIAgent = async () => {
  if (!aiAgent) {
    aiAgent = new AttendanceAIAgent();
    await aiAgent.initialize();
  }
  return aiAgent;
};

// Cleanup function for graceful shutdown
const cleanupAIAgent = () => {
  if (aiAgent) {
    aiAgent = null;
  }
};

module.exports = { getAIAgent, AttendanceAIAgent, cleanupAIAgent };
