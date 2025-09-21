require("dotenv").config();
const mongoose = require("mongoose");
const { ChatGroq } = require("@langchain/groq");
const { HumanMessage } = require("@langchain/core/messages");

class AttendanceAIAgent {
  constructor() {
    this.llm = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  async initialize() {
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is required for AI functionality");
      }

      // Wait for MongoDB connection if needed
      if (mongoose.connection.readyState !== 1) {
        console.log("⚠️ Waiting for MongoDB connection...");
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("MongoDB connection timeout")),
            10000
          );
          mongoose.connection.once("connected", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      // Initialize Groq LLM
      this.llm = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        temperature: 0.1,
        maxTokens: 2000,
        timeout: 30000,
      });

      this.isInitialized = true;
      console.log("✅ AI Agent initialized successfully");

      return { success: true, message: "AI Agent ready" };
    } catch (error) {
      console.error("❌ AI Agent initialization failed:", error);
      this.isInitialized = false;
      throw error;
    }
  }

  async query(question, organizationId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check cache first
      const cacheKey = `${organizationId}:${question}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("📖 Returning cached response");
        return cached.response;
      }

      // Get attendance data for context
      const context = await this.getAttendanceContext(organizationId);

      // Build comprehensive prompt
      const prompt = this.buildPrompt(question, context);

      console.log("🤖 Querying AI with context...");

      // Get AI response
      const messages = [new HumanMessage({ content: prompt })];
      const aiResponse = await this.llm.invoke(messages);

      const responseText = aiResponse.content;
      console.log("✅ AI response generated successfully");

      const result = {
        success: true,
        response: responseText,
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        timestamp: new Date().toISOString(),
      };

      // Cache the result
      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now(),
      });

      // Clean old cache entries
      this.cleanCache();

      return result;
    } catch (error) {
      console.error("❌ AI Query failed:", error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  async getAttendanceContext(organizationId) {
    try {
      const User = mongoose.model("User");
      const Attendance = mongoose.model("Attendance");
      const DailyTimeSheet = mongoose.model("DailyTimeSheet");

      // Get organization users
      const users = await User.find({ organizationId })
        .select("email firstName lastName")
        .lean();

      // Get today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = await Attendance.find({
        organizationId,
        createdAt: { $gte: today, $lt: tomorrow },
      })
        .populate("userId", "email firstName lastName")
        .lean();

      // Get recent timesheets (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentTimesheets = await DailyTimeSheet.find({
        organizationId,
        date: { $gte: weekAgo },
      })
        .populate("userId", "email firstName lastName")
        .lean();

      // Calculate basic stats
      const totalUsers = users.length;
      const presentToday = todayAttendance.filter(
        (a) => a.status === "present"
      ).length;
      const absentToday = totalUsers - presentToday;
      const attendanceRate =
        totalUsers > 0 ? ((presentToday / totalUsers) * 100).toFixed(1) : 0;

      return {
        organizationId,
        totalUsers,
        users: users.slice(0, 20),
        todayAttendance,
        recentTimesheets: recentTimesheets.slice(0, 50),
        stats: {
          presentToday,
          absentToday,
          attendanceRate: `${attendanceRate}%`,
        },
        contextGeneratedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Context generation failed:", error);
      return {
        organizationId,
        error: "Failed to load attendance context",
        contextGeneratedAt: new Date().toISOString(),
      };
    }
  }

  buildPrompt(question, context) {
    const currentDate = new Date().toDateString();
    const currentTime = new Date().toLocaleTimeString();

    return `You are an advanced AI assistant for attendance management system analysis.

CURRENT CONTEXT:
Date: ${currentDate}
Time: ${currentTime}
Organization ID: ${context.organizationId}
Total Users: ${context.totalUsers}

TODAY'S ATTENDANCE SUMMARY:
- Present: ${context.stats?.presentToday || 0} employees
- Absent: ${context.stats?.absentToday || 0} employees  
- Attendance Rate: ${context.stats?.attendanceRate || "0%"}
- Total Records: ${context.todayAttendance?.length || 0}

USERS IN ORGANIZATION:
${
  context.users
    ?.map((u) => `- ${u.email} (${u.firstName} ${u.lastName})`)
    .join("\n") || "No users found"
}

TODAY'S ATTENDANCE DETAILS:
${
  context.todayAttendance
    ?.map((a) => {
      const user = a.userId;
      const time = new Date(a.createdAt).toLocaleTimeString();
      return `- ${user?.email || "Unknown"}: ${a.status} at ${time}`;
    })
    .join("\n") || "No attendance records today"
}

RECENT ACTIVITY (Last 7 days):
${
  context.recentTimesheets
    ?.slice(0, 10)
    .map((t) => {
      const user = t.userId;
      const date = new Date(t.date).toDateString();
      return `- ${user?.email || "Unknown"}: ${date} - ${
        t.totalHours || "N/A"
      } hours`;
    })
    .join("\n") || "No recent timesheet data"
}

INSTRUCTIONS:
1. Provide clear, concise answers about attendance data
2. Use specific numbers and statistics when available
3. Format responses in a friendly, professional tone
4. Use bullet points for lists and clear structure
5. If data is missing, clearly state what information is not available
6. Provide actionable insights when possible
7. Keep responses focused and relevant to the question

USER QUESTION: ${question}

Please provide a helpful answer based on the available attendance data:`;
  }

  cleanCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  getCapabilities() {
    return {
      model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
      tts: "Frontend Browser TTS",
      version: "2.0.0-simplified",
      features: [
        "Attendance Analytics",
        "User Behavior Insights",
        "Time Tracking Analysis",
        "Organizational Reports",
        "Real-time Data Context",
        "Intelligent Caching",
      ],
    };
  }

  getHealthStatus() {
    return {
      status: this.isInitialized ? "healthy" : "unhealthy",
      initialized: this.isInitialized,
      cacheSize: this.cache.size,
      model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
      lastHealthCheck: new Date().toISOString(),
      audioMode: "frontend-only",
    };
  }

  async cleanup() {
    try {
      this.cache.clear();
      console.log("✅ AI Agent cleanup completed");
    } catch (error) {
      console.error("❌ AI Agent cleanup failed:", error);
    }
  }
}

// Singleton instance
let aiAgentInstance = null;

const getAIAgent = async () => {
  if (!aiAgentInstance) {
    aiAgentInstance = new AttendanceAIAgent();
    try {
      await aiAgentInstance.initialize();
    } catch (error) {
      console.error("❌ Failed to initialize AI Agent:", error);
      throw error;
    }
  }
  return aiAgentInstance;
};

// Cleanup on process termination
process.on("SIGTERM", async () => {
  if (aiAgentInstance) {
    await aiAgentInstance.cleanup();
  }
});

process.on("SIGINT", async () => {
  if (aiAgentInstance) {
    await aiAgentInstance.cleanup();
  }
});

module.exports = { getAIAgent, AttendanceAIAgent };
