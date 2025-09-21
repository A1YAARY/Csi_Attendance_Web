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
          mongoose.connection.on("connected", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      // Setup optimized Groq LLM
      this.llm = new ChatGroq({
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.1,
        maxTokens: 2000,
        timeout: 30000,
        maxRetries: 3,
        streaming: false,
      });

      this.isInitialized = true;
      console.log("✅ AI Agent initialized successfully");
    } catch (error) {
      console.error("❌ AI Agent initialization failed:", error);
      throw error;
    }
  }

  // 🔧 FIXED: ObjectId validation helper [web:132][web:128]
  isValidObjectId(id) {
    if (!id) return false;

    // Convert to string if it's not already
    const idStr = String(id);

    // Check if it's a valid ObjectId format
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      return false;
    }

    // Additional check to ensure it's exactly 24 hex characters [web:132]
    if (idStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(idStr)) {
      return true;
    }

    return false;
  }

  // 🔧 FIXED: Safe ObjectId conversion [web:128]
  toObjectId(id) {
    if (!this.isValidObjectId(id)) {
      throw new Error(
        `Invalid ObjectId format: ${id}. Must be a 24 character hex string.`
      );
    }
    return new mongoose.Types.ObjectId(id);
  }

  async query(question, organizationId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!organizationId) {
      return "❌ Error: Organization context is required for security";
    }

    // 🔧 FIXED: Validate organizationId before using it [web:128]
    if (!this.isValidObjectId(organizationId)) {
      return `❌ Error: Invalid organization ID format: ${organizationId}. Please check your authentication.`;
    }

    try {
      // Check cache first for performance
      const cacheKey = `${organizationId}_${question}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return `${cached} (cached)`;
      }

      // Create intelligent prompt that includes data context
      const contextPrompt = await this.buildContextPrompt(
        question,
        organizationId
      );

      const response = await this.llm.invoke([
        new HumanMessage({
          content: contextPrompt,
        }),
      ]);

      const result = response.content;

      // Cache the result
      this.setCacheResult(cacheKey, result);

      return result;
    } catch (error) {
      console.error("AI Agent query error:", error);
      return `❌ Error processing request: ${error.message}`;
    }
  }

  async buildContextPrompt(question, organizationId) {
    const today = new Date().toISOString().split("T")[0];
    const context = await this.gatherRelevantData(
      question,
      organizationId,
      today
    );

    return `You are an advanced attendance analytics assistant for an organization.

ORGANIZATION CONTEXT:
- Organization ID: ${organizationId}
- Current Date: ${today}

CURRENT DATA CONTEXT:
${context}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Use the provided data context to answer the question accurately
2. If asking about "today", use ${today}
3. If asking about specific users, check the data carefully
4. Provide clear, formatted responses with emojis
5. If no data is available, say so clearly
6. Always be specific with numbers and percentages

Please provide a comprehensive answer based on the available data:`;
  }

  async gatherRelevantData(question, organizationId, date) {
    try {
      // 🔧 FIXED: Validate organizationId before database operations [web:128]
      if (!this.isValidObjectId(organizationId)) {
        return `Error: Invalid organization ID format. Cannot retrieve data.`;
      }

      const User = mongoose.model("User");
      const Attendance = mongoose.model("Attendance");

      let context = "";

      // Check if question is about today's attendance
      if (this.isAboutToday(question)) {
        const todayData = await this.getTodaysSummary(organizationId, date);
        context += `TODAY'S ATTENDANCE DATA (${date}):\n${todayData}\n\n`;
      }

      // Check if question mentions specific user
      const userEmail = this.extractEmailFromQuestion(question);
      if (userEmail) {
        const userData = await this.getUserData(
          userEmail,
          organizationId,
          date
        );
        context += `USER SPECIFIC DATA:\n${userData}\n\n`;
      }

      // Check if question is about absent users
      if (this.isAboutAbsent(question)) {
        const absentData = await this.getAbsentUsers(organizationId, date);
        context += `ABSENT USERS DATA:\n${absentData}\n\n`;
      }

      // Check if question is about late arrivals
      if (this.isAboutLate(question)) {
        const lateData = await this.getLateUsers(organizationId, date);
        context += `LATE ARRIVALS DATA:\n${lateData}\n\n`;
      }

      // Add general statistics for context
      const generalStats = await this.getGeneralStats(organizationId);
      context += `GENERAL ORGANIZATION STATS:\n${generalStats}`;

      return context;
    } catch (error) {
      console.error("Error gathering context:", error);
      return `No data available due to error: ${error.message}`;
    }
  }

  // 🔧 FIXED: All database query methods with proper ObjectId handling [web:128]
  async getTodaysSummary(organizationId, date) {
    try {
      // 🔧 FIXED: Safe ObjectId conversion [web:128]
      const orgObjectId = this.toObjectId(organizationId);

      const User = mongoose.model("User");
      const Attendance = mongoose.model("Attendance");

      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");

      // 🔧 FIXED: Proper ObjectId usage in queries [web:128]
      const [totalUsers, attendanceRecords] = await Promise.all([
        User.countDocuments({
          role: "user",
          organizationId: orgObjectId, // Using proper ObjectId
        }),
        Attendance.find({
          organizationId: orgObjectId, // Using proper ObjectId
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
          .populate("userId", "name email")
          .lean(),
      ]);

      const presentCount = attendanceRecords.length;
      const absentCount = totalUsers - presentCount;
      const presentPercent =
        totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0;

      // Detailed breakdown
      const checkIns = attendanceRecords.filter(
        (r) => r.type === "check-in"
      ).length;
      const checkOuts = attendanceRecords.filter(
        (r) => r.type === "check-out"
      ).length;

      return `📊 ATTENDANCE SUMMARY FOR ${date}:
• Total Employees: ${totalUsers}
• Present: ${presentCount}/${totalUsers} (${presentPercent}%)
• Absent: ${absentCount}
• Check-ins: ${checkIns}
• Check-outs: ${checkOuts}
• Active Sessions: ${checkIns - checkOuts}

PRESENT EMPLOYEES:
${
  presentCount > 0
    ? attendanceRecords
        .map(
          (r) =>
            `• ${r.userId?.name || "Unknown"} (${
              r.userId?.email || "No email"
            })`
        )
        .join("\n")
    : "• No employees present today"
}`;
    } catch (error) {
      console.error("Error in getTodaysSummary:", error);
      return `Error getting today's summary: ${error.message}`;
    }
  }

  async getAbsentUsers(organizationId, date) {
    try {
      // 🔧 FIXED: Safe ObjectId conversion [web:128]
      const orgObjectId = this.toObjectId(organizationId);

      const User = mongoose.model("User");
      const Attendance = mongoose.model("Attendance");

      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");

      // 🔧 FIXED: Proper ObjectId usage [web:128]
      const presentUserIds = await Attendance.distinct("userId", {
        organizationId: orgObjectId, // Using proper ObjectId
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      const absentUsers = await User.find({
        _id: { $nin: presentUserIds },
        role: "user",
        organizationId: orgObjectId, // Using proper ObjectId
      })
        .select("name email department")
        .lean();

      if (absentUsers.length === 0) {
        return `✅ ALL EMPLOYEES PRESENT - No one is absent on ${date}`;
      }

      return `❌ ABSENT EMPLOYEES ON ${date} (${absentUsers.length} total):
${absentUsers
  .map(
    (user) =>
      `• ${user.name || "No name"} (${user.email || "No email"}) - ${
        user.department || "No department"
      }`
  )
  .join("\n")}`;
    } catch (error) {
      console.error("Error in getAbsentUsers:", error);
      return `Error getting absent users: ${error.message}`;
    }
  }

  async getLateUsers(organizationId, date) {
    try {
      // 🔧 FIXED: Safe ObjectId conversion [web:128]
      const orgObjectId = this.toObjectId(organizationId);

      const Attendance = mongoose.model("Attendance");

      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");

      // Consider late if check-in is after 9:30 AM
      const lateThreshold = new Date(date + "T09:30:00.000Z");

      // 🔧 FIXED: Proper ObjectId usage [web:128]
      const lateArrivals = await Attendance.find({
        organizationId: orgObjectId, // Using proper ObjectId
        createdAt: { $gte: lateThreshold, $lte: endOfDay },
        type: "check-in",
      })
        .populate("userId", "name email")
        .lean();

      if (lateArrivals.length === 0) {
        return `✅ NO LATE ARRIVALS - Everyone arrived on time on ${date}`;
      }

      return `⏰ LATE ARRIVALS ON ${date} (${lateArrivals.length} total):
${lateArrivals
  .map((record) => {
    const time = new Date(record.createdAt).toLocaleTimeString();
    return `• ${record.userId?.name || "Unknown"} (${
      record.userId?.email || "No email"
    }) - Arrived at ${time}`;
  })
  .join("\n")}`;
    } catch (error) {
      console.error("Error in getLateUsers:", error);
      return `Error getting late users: ${error.message}`;
    }
  }

  async getUserData(userEmail, organizationId, date) {
    try {
      // 🔧 FIXED: Safe ObjectId conversion [web:128]
      const orgObjectId = this.toObjectId(organizationId);

      const User = mongoose.model("User");
      const Attendance = mongoose.model("Attendance");

      // 🔧 FIXED: Proper ObjectId usage [web:128]
      const user = await User.findOne({
        email: userEmail,
        organizationId: orgObjectId, // Using proper ObjectId
      }).lean();

      if (!user) {
        return `❌ USER NOT FOUND: ${userEmail} not found in your organization`;
      }

      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");

      // 🔧 FIXED: user._id is already an ObjectId, no need to convert [web:128]
      const todayAttendance = await Attendance.find({
        userId: user._id, // user._id is already ObjectId from database
        organizationId: orgObjectId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).lean();

      const checkIn = todayAttendance.find((r) => r.type === "check-in");
      const checkOut = todayAttendance.find((r) => r.type === "check-out");

      return `👤 USER DATA FOR ${
        user.name || "Unknown"
      } (${userEmail}) ON ${date}:
• Department: ${user.department || "Not specified"}
• Role: ${user.role || "user"}
• Check-in: ${
        checkIn
          ? new Date(checkIn.createdAt).toLocaleTimeString()
          : "Not checked in"
      }
• Check-out: ${
        checkOut
          ? new Date(checkOut.createdAt).toLocaleTimeString()
          : "Not checked out"
      }
• Status: ${
        checkIn ? (checkOut ? "Completed day" : "Currently active") : "Absent"
      }`;
    } catch (error) {
      console.error("Error in getUserData:", error);
      return `Error getting user data: ${error.message}`;
    }
  }

  async getGeneralStats(organizationId) {
    try {
      // 🔧 FIXED: Safe ObjectId conversion [web:128]
      const orgObjectId = this.toObjectId(organizationId);

      const User = mongoose.model("User");

      // 🔧 FIXED: Proper ObjectId usage [web:128]
      const totalEmployees = await User.countDocuments({
        role: "user",
        organizationId: orgObjectId, // Using proper ObjectId
      });

      return `• Total Employees in Organization: ${totalEmployees}`;
    } catch (error) {
      console.error("Error in getGeneralStats:", error);
      return `Error getting general stats: ${error.message}`;
    }
  }

  // Helper methods for intelligent parsing
  isAboutToday(question) {
    const todayKeywords = ["today", "today's", "current", "now", "present day"];
    return todayKeywords.some((keyword) =>
      question.toLowerCase().includes(keyword)
    );
  }

  isAboutAbsent(question) {
    const absentKeywords = [
      "absent",
      "missing",
      "not present",
      "didn't come",
      "who was absent",
    ];
    return absentKeywords.some((keyword) =>
      question.toLowerCase().includes(keyword)
    );
  }

  isAboutLate(question) {
    const lateKeywords = [
      "late",
      "delayed",
      "tardy",
      "late arrival",
      "came late",
    ];
    return lateKeywords.some((keyword) =>
      question.toLowerCase().includes(keyword)
    );
  }

  extractEmailFromQuestion(question) {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const match = question.match(emailRegex);
    return match ? match[0] : null;
  }

  // Caching for performance optimization
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCacheResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}

// Singleton pattern for performance
let aiAgent = null;

const getAIAgent = async () => {
  if (!aiAgent) {
    aiAgent = new AttendanceAIAgent();
    await aiAgent.initialize();
  }
  return aiAgent;
};

const cleanupAIAgent = () => {
  if (aiAgent) {
    aiAgent.cache.clear();
    aiAgent = null;
  }
};

module.exports = { getAIAgent, AttendanceAIAgent, cleanupAIAgent };
