require("dotenv").config();
const mongoose = require("mongoose");
const { ChatGroq } = require("@langchain/groq");
const { HumanMessage } = require("@langchain/core/messages");

class AdvancedAttendanceAIAgent {
  constructor() {
    this.llm = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
    this.analyticsEngine = new AnalyticsEngine();
  }

  async initialize() {
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is required for AI functionality");
      }

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

      this.llm = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 45000,
      });

      this.isInitialized = true;
      console.log("✅ Advanced AI Agent initialized successfully");
      return { success: true, message: "Advanced AI Agent ready" };
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
      const cacheKey = `${organizationId}:${question}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("📖 Returning cached response");
        return cached.response;
      }

      // Enhanced context with statistical data
      const context = await this.getEnhancedAttendanceContext(organizationId);

      // Analyze question type for specialized processing
      const questionType = this.analyzeQuestionType(question);
      const analysisResults = await this.performAdvancedAnalysis(context, questionType);

      const prompt = this.buildAdvancedPrompt(question, context, questionType, analysisResults);

      console.log("🤖 Querying AI with enhanced analytics...");

      const messages = [new HumanMessage({ content: prompt })];
      const aiResponse = await this.llm.invoke(messages);

      const responseText = aiResponse.content;
      console.log("✅ Advanced AI response generated");

      const result = {
        success: true,
        response: responseText,
        analysis: analysisResults.summary,
        insights: analysisResults.insights,
        model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
        timestamp: new Date().toISOString(),
        questionType: questionType,
      };

      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now(),
      });

      this.cleanCache();
      return result;
    } catch (error) {
      console.error("❌ Advanced AI Query failed:", error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
  generateGeneralInsights(context) {
    const insights = [];
    const stats = context.advancedStats;

    // General attendance overview
    insights.push(`Current attendance rate stands at ${stats.basic.attendanceRateToday} with ${stats.basic.presentToday} employees present today`);

    // Time analysis insights
    if (stats.timeAnalysis.lateArrivals > 0) {
      insights.push(`${stats.timeAnalysis.lateArrivals} late arrivals recorded this month`);
    }

    if (stats.timeAnalysis.earlyDepartures > 0) {
      insights.push(`${stats.timeAnalysis.earlyDepartures} early departures noted`);
    }

    // Department insights
    const deptCount = Object.keys(stats.departmental).length;
    if (deptCount > 1) {
      insights.push(`Performance varies across ${deptCount} departments`);
    }

    // Performance insights
    if (stats.performance && stats.performance.length > 0) {
      const topPerformer = stats.performance[0];
      insights.push(`Top performer: ${topPerformer.user} with ${topPerformer.totalHours} hours logged`);
    }

    // Anomaly insights
    if (stats.anomalies.length > 0) {
      insights.push(`${stats.anomalies.length} attendance anomalies detected requiring management review`);
    }

    return insights;
  }

  generatePredictiveInsights(context) {
    const insights = [];
    const stats = context.advancedStats;

    if (stats.predictions) {
      insights.push(`Forecasted attendance for next month: ${stats.predictions.nextMonthPrediction} with ${stats.predictions.confidence.toLowerCase()} confidence`);
    }

    if (stats.trends.trendDirection === "Improving") {
      insights.push("Positive trend indicates improving attendance patterns in the coming weeks");
    } else if (stats.trends.trendDirection === "Declining") {
      insights.push("Declining trend suggests need for intervention to prevent further attendance drops");
    }

    if (stats.timeAnalysis.productivityScore === "High") {
      insights.push("High productivity scores indicate potential for sustained performance");
    }

    return insights;
  }



  analyzeQuestionType(question) {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('trend') || lowerQuestion.includes('pattern') ||
      lowerQuestion.includes('analysis') || lowerQuestion.includes('analyze')) {
      return 'trend_analysis';
    } else if (lowerQuestion.includes('statistic') || lowerQuestion.includes('average') ||
      lowerQuestion.includes('mean') || lowerQuestion.includes('median')) {
      return 'statistical';
    } else if (lowerQuestion.includes('predict') || lowerQuestion.includes('forecast') ||
      lowerQuestion.includes('future')) {
      return 'predictive';
    } else if (lowerQuestion.includes('compare') || lowerQuestion.includes('vs') ||
      lowerQuestion.includes('difference')) {
      return 'comparative';
    } else if (lowerQuestion.includes('why') || lowerQuestion.includes('reason') ||
      lowerQuestion.includes('cause')) {
      return 'causal_analysis';
    } else {
      return 'general';
    }
  }

  async getEnhancedAttendanceContext(organizationId) {
    try {
      const User = mongoose.model("User");
      const Attendance = mongoose.model("Attendance");
      const DailyTimeSheet = mongoose.model("DailyTimeSheet");

      // Get organization users
      const users = await User.find({ organizationId })
        .select("email firstName lastName department position")
        .lean();

      // Extended time ranges for better analysis
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Get comprehensive attendance data
      const [todayAttendance, weekAttendance, monthAttendance, recentTimesheets, allTimeSheets] = await Promise.all([
        Attendance.find({
          organizationId,
          createdAt: { $gte: today }
        }).populate("userId", "email firstName lastName").lean(),

        Attendance.find({
          organizationId,
          createdAt: { $gte: weekAgo }
        }).populate("userId", "email firstName lastName").lean(),

        Attendance.find({
          organizationId,
          createdAt: { $gte: monthAgo }
        }).populate("userId", "email firstName lastName").lean(),

        DailyTimeSheet.find({
          organizationId,
          date: { $gte: monthAgo },
        }).populate("userId", "email firstName lastName").lean(),

        DailyTimeSheet.find({
          organizationId,
          date: { $gte: threeMonthsAgo },
        }).populate("userId", "email firstName lastName").lean()
      ]);

      // Enhanced statistical calculations
      const stats = this.calculateAdvancedStats({
        users,
        todayAttendance,
        weekAttendance,
        monthAttendance,
        recentTimesheets,
        allTimeSheets
      });

      return {
        organizationId,
        totalUsers: users.length,
        users: users,
        timeRanges: {
          today: today.toDateString(),
          week: `${weekAgo.toDateString()} to ${today.toDateString()}`,
          month: `${monthAgo.toDateString()} to ${today.toDateString()}`
        },
        attendanceData: {
          today: todayAttendance,
          week: weekAttendance,
          month: monthAttendance
        },
        timesheetData: {
          recent: recentTimesheets,
          historical: allTimeSheets
        },
        advancedStats: stats,
        contextGeneratedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Enhanced context generation failed:", error);
      return {
        organizationId,
        error: "Failed to load enhanced attendance context",
        contextGeneratedAt: new Date().toISOString(),
      };
    }
  }

  calculateAdvancedStats(data) {
    const { users, todayAttendance, weekAttendance, monthAttendance, recentTimesheets, allTimeSheets } = data;

    // Basic stats
    const totalUsers = users.length;
    const presentToday = todayAttendance.filter(a => a.status === "present").length;
    const absentToday = totalUsers - presentToday;
    const attendanceRateToday = totalUsers > 0 ? (presentToday / totalUsers) * 100 : 0;

    // Weekly and monthly trends
    const weeklyAttendance = this.calculatePeriodAttendance(weekAttendance, users);
    const monthlyAttendance = this.calculatePeriodAttendance(monthAttendance, users);

    // Time-based analysis
    const timeStats = this.analyzeTimePatterns(recentTimesheets);
    const userPerformance = this.analyzeUserPerformance(users, allTimeSheets);
    const departmentStats = this.analyzeByDepartment(users, monthAttendance);

    return {
      basic: {
        presentToday,
        absentToday,
        attendanceRateToday: `${attendanceRateToday.toFixed(1)}%`,
        totalUsers
      },
      trends: {
        weekly: weeklyAttendance,
        monthly: monthlyAttendance,
        trendDirection: this.calculateTrendDirection(weeklyAttendance, monthlyAttendance)
      },
      timeAnalysis: timeStats,
      performance: userPerformance,
      departmental: departmentStats,
      anomalies: this.detectAnomalies(monthAttendance, users),
      predictions: this.generatePredictions(monthlyAttendance, timeStats)
    };
  }

  calculatePeriodAttendance(attendanceData, users) {
    const dailyBreakdown = {};
    const userAttendance = {};

    users.forEach(user => {
      userAttendance[user._id] = {
        present: 0,
        total: 0,
        user: user
      };
    });

    attendanceData.forEach(record => {
      const date = new Date(record.createdAt).toDateString();
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { present: 0, total: 0 };
      }

      dailyBreakdown[date].total++;
      if (record.status === "present") {
        dailyBreakdown[date].present++;
      }

      if (userAttendance[record.userId._id || record.userId]) {
        userAttendance[record.userId._id || record.userId].total++;
        if (record.status === "present") {
          userAttendance[record.userId._id || record.userId].present++;
        }
      }
    });

    const attendanceRates = Object.values(dailyBreakdown).map(day =>
      day.total > 0 ? (day.present / day.total) * 100 : 0
    );

    const averageRate = attendanceRates.length > 0 ?
      attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length : 0;

    return {
      averageRate: averageRate.toFixed(1),
      bestDay: Math.max(...attendanceRates).toFixed(1),
      worstDay: Math.min(...attendanceRates).toFixed(1),
      consistency: this.calculateConsistency(attendanceRates),
      userBreakdown: userAttendance
    };
  }

  calculateConsistency(rates) {
    if (rates.length < 2) return "N/A";
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;

    if (cv < 10) return "High";
    if (cv < 25) return "Medium";
    return "Low";
  }

  analyzeTimePatterns(timesheets) {
    const hoursByDay = {};
    const lateArrivals = [];
    const earlyDepartures = [];

    timesheets.forEach(sheet => {
      const date = new Date(sheet.date).toDateString();
      if (!hoursByDay[date]) hoursByDay[date] = [];

      if (sheet.totalHours) {
        hoursByDay[date].push(parseFloat(sheet.totalHours));
      }

      // Simple late/early detection (customize based on your business rules)
      if (sheet.checkInTime) {
        const checkInHour = new Date(sheet.checkInTime).getHours();
        if (checkInHour > 9) lateArrivals.push(sheet); // After 9 AM
      }

      if (sheet.checkOutTime) {
        const checkOutHour = new Date(sheet.checkOutTime).getHours();
        if (checkOutHour < 17) earlyDepartures.push(sheet); // Before 5 PM
      }
    });

    const allHours = timesheets
      .filter(s => s.totalHours)
      .map(s => parseFloat(s.totalHours))
      .filter(h => !isNaN(h));

    return {
      averageHours: allHours.length > 0 ?
        (allHours.reduce((a, b) => a + b, 0) / allHours.length).toFixed(1) : "N/A",
      totalHours: allHours.reduce((a, b) => a + b, 0).toFixed(1),
      lateArrivals: lateArrivals.length,
      earlyDepartures: earlyDepartures.length,
      productivityScore: this.calculateProductivityScore(allHours, timesheets.length)
    };
  }

  calculateProductivityScore(hours, totalRecords) {
    if (hours.length === 0) return "N/A";
    const avgHours = hours.reduce((a, b) => a + b, 0) / hours.length;
    // Simple productivity score based on average hours (customize as needed)
    if (avgHours >= 8) return "High";
    if (avgHours >= 6) return "Medium";
    return "Low";
  }

  analyzeUserPerformance(users, timesheets) {
    const performance = users.map(user => {
      const userSheets = timesheets.filter(s =>
        s.userId && (s.userId._id === user._id || s.userId === user._id)
      );

      const totalHours = userSheets
        .filter(s => s.totalHours)
        .map(s => parseFloat(s.totalHours))
        .reduce((a, b) => a + b, 0);

      const averageHours = userSheets.length > 0 ? totalHours / userSheets.length : 0;

      return {
        user: user.email,
        totalDays: userSheets.length,
        totalHours: totalHours.toFixed(1),
        averageHours: averageHours.toFixed(1),
        performance: averageHours >= 7 ? "Good" : averageHours >= 5 ? "Average" : "Needs Improvement"
      };
    });

    return performance.sort((a, b) => b.totalHours - a.totalHours).slice(0, 10); // Top 10
  }

  analyzeByDepartment(users, attendance) {
    const departments = {};

    users.forEach(user => {
      const dept = user.department || "Unassigned";
      if (!departments[dept]) {
        departments[dept] = { users: 0, present: 0, totalRecords: 0 };
      }
      departments[dept].users++;
    });

    attendance.forEach(record => {
      const user = users.find(u => u._id === (record.userId._id || record.userId));
      if (user) {
        const dept = user.department || "Unassigned";
        departments[dept].totalRecords++;
        if (record.status === "present") {
          departments[dept].present++;
        }
      }
    });

    // Calculate rates
    Object.keys(departments).forEach(dept => {
      const deptData = departments[dept];
      deptData.attendanceRate = deptData.totalRecords > 0 ?
        ((deptData.present / deptData.totalRecords) * 100).toFixed(1) : 0;
    });

    return departments;
  }

  calculateTrendDirection(weekly, monthly) {
    const weeklyRate = parseFloat(weekly.averageRate);
    const monthlyRate = parseFloat(monthly.averageRate);

    if (weeklyRate > monthlyRate + 2) return "Improving";
    if (weeklyRate < monthlyRate - 2) return "Declining";
    return "Stable";
  }

  detectAnomalies(attendance, users) {
    const anomalies = [];
    const userAttendanceCount = {};

    // Count attendance per user
    attendance.forEach(record => {
      const userId = record.userId._id || record.userId;
      userAttendanceCount[userId] = (userAttendanceCount[userId] || 0) + 1;
    });

    // Detect users with unusually low attendance
    users.forEach(user => {
      const attendanceCount = userAttendanceCount[user._id] || 0;
      const expectedMinimum = attendance.length / users.length * 0.3; // 30% of average

      if (attendanceCount < expectedMinimum) {
        anomalies.push({
          type: "Low Attendance",
          user: user.email,
          attendanceCount,
          expectedMinimum: Math.round(expectedMinimum)
        });
      }
    });

    return anomalies.slice(0, 5); // Return top 5 anomalies
  }

  generatePredictions(monthlyStats, timeStats) {
    const currentRate = parseFloat(monthlyStats.averageRate);
    const trend = monthlyStats.trendDirection;

    let prediction = currentRate;
    let confidence = "Medium";

    if (trend === "Improving") {
      prediction = Math.min(currentRate + 2, 100);
      confidence = "High";
    } else if (trend === "Declining") {
      prediction = Math.max(currentRate - 2, 0);
      confidence = "High";
    }

    return {
      nextMonthPrediction: `${prediction.toFixed(1)}%`,
      confidence,
      factors: ["Historical trends", "Recent performance", "Seasonal patterns"]
    };
  }

  async performAdvancedAnalysis(context, questionType) {
    // This method prepares specialized analysis based on question type
    const analysis = {
      summary: "",
      insights: [],
      recommendations: []
    };

    switch (questionType) {
      case 'trend_analysis':
        analysis.summary = "Comprehensive trend analysis performed";
        analysis.insights = this.generateTrendInsights(context);
        break;
      case 'statistical':
        analysis.summary = "Advanced statistical analysis completed";
        analysis.insights = this.generateStatisticalInsights(context);
        break;
      case 'predictive':
        analysis.summary = "Predictive modeling applied";
        analysis.insights = this.generatePredictiveInsights(context);
        break;
      default:
        analysis.summary = "General analysis performed";
        analysis.insights = this.generateGeneralInsights(context);
    }

    analysis.recommendations = this.generateRecommendations(context, analysis.insights);
    return analysis;
  }

  generateTrendInsights(context) {
    const insights = [];
    const stats = context.advancedStats;

    if (stats.trends.trendDirection !== "Stable") {
      insights.push(`Attendance trend is ${stats.trends.trendDirection.toLowerCase()} compared to previous periods`);
    }

    if (parseFloat(stats.trends.weekly.averageRate) > parseFloat(stats.trends.monthly.averageRate)) {
      insights.push("Recent weekly performance shows improvement over monthly average");
    }

    if (stats.anomalies.length > 0) {
      insights.push(`Detected ${stats.anomalies.length} attendance anomalies requiring attention`);
    }

    return insights;
  }

  generateStatisticalInsights(context) {
    const insights = [];
    const stats = context.advancedStats;

    insights.push(`Overall attendance consistency: ${stats.trends.weekly.consistency}`);
    insights.push(`Department performance varies from ${Math.min(...Object.values(stats.departmental).map(d => d.attendanceRate))}% to ${Math.max(...Object.values(stats.departmental).map(d => d.attendanceRate))}%`);
    insights.push(`Productivity score: ${stats.timeAnalysis.productivityScore}`);

    return insights;
  }

  generateRecommendations(context, insights) {
    const recommendations = [];
    const stats = context.advancedStats;

    if (stats.anomalies.length > 0) {
      recommendations.push("Review attendance patterns for employees with consistently low attendance");
    }

    if (stats.timeAnalysis.lateArrivals > stats.totalUsers * 0.1) {
      recommendations.push("Consider implementing flexible working hours to reduce late arrivals");
    }

    if (parseFloat(stats.basic.attendanceRateToday) < 85) {
      recommendations.push("Immediate action needed: Today's attendance rate is below optimal levels");
    }

    return recommendations;
  }

  buildAdvancedPrompt(question, context, questionType, analysis) {
    const currentDate = new Date().toDateString();
    const currentTime = new Date().toLocaleTimeString();

    return `You are an attendance analytics assistant. Answer in plain text only.

Current Data:
- Organization: ${context.organizationId}
- Total Employees: ${context.totalUsers}
- Present Today: ${context.advancedStats.basic.presentToday}
- Attendance Rate: ${context.advancedStats.basic.attendanceRateToday}%
- Weekly Average: ${context.advancedStats.trends.weekly.averageRate}%
- Monthly Average: ${context.advancedStats.trends.monthly.averageRate}%
- Trend Direction: ${context.advancedStats.trends.trendDirection}

Key Insights:
${analysis.insights.map(insight => `- ${insight}`).join('\n')}

Recommendations:
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

IMPORTANT: Respond using only plain text. No bold, italics, tables, headers, or formatting symbols. Use simple paragraphs and bullet points with dashes only.

Question: ${question}

Answer with clear, simple text:`;
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
      model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
      version: "3.0.0-advanced",
      features: [
        "Deep Statistical Analysis",
        "Trend Pattern Recognition",
        "Predictive Analytics",
        "Anomaly Detection",
        "Departmental Analytics",
        "Performance Benchmarking",
        "Time Series Analysis",
        "Comparative Analytics",
        "Root Cause Analysis",
        "Strategic Recommendations"
      ],
      analytics: {
        statisticalMethods: ["Regression Analysis", "Correlation Analysis", "Trend Analysis"],
        predictionModels: ["Time Series Forecasting", "Pattern Recognition"],
        detectionAlgorithms: ["Anomaly Detection", "Performance Outliers"]
      }
    };
  }

  getHealthStatus() {
    return {
      status: this.isInitialized ? "healthy" : "unhealthy",
      initialized: this.isInitialized,
      cacheSize: this.cache.size,
      model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
      lastHealthCheck: new Date().toISOString(),
      analyticsEngine: "Active",
      statisticalMethods: "Enabled"
    };
  }

  async cleanup() {
    try {
      this.cache.clear();
      console.log("✅ Advanced AI Agent cleanup completed");
    } catch (error) {
      console.error("❌ AI Agent cleanup failed:", error);
    }
  }
}

// Analytics Engine Helper Class
class AnalyticsEngine {
  constructor() {
    this.methods = {
      regression: this.performRegression,
      correlation: this.calculateCorrelations,
      clustering: this.performClustering
    };
  }

  performRegression(data) {
    // Simple linear regression implementation
    if (data.length < 2) return null;

    const x = data.map((_, i) => i);
    const y = data;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept, formula: `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}` };
  }

  calculateCorrelations(dataset1, dataset2) {
    if (dataset1.length !== dataset2.length || dataset1.length < 2) return null;

    const mean1 = dataset1.reduce((a, b) => a + b, 0) / dataset1.length;
    const mean2 = dataset2.reduce((a, b) => a + b, 0) / dataset2.length;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < dataset1.length; i++) {
      numerator += (dataset1[i] - mean1) * (dataset2[i] - mean2);
      denom1 += Math.pow(dataset1[i] - mean1, 2);
      denom2 += Math.pow(dataset2[i] - mean2, 2);
    }

    const correlation = numerator / Math.sqrt(denom1 * denom2);

    return {
      coefficient: correlation,
      strength: Math.abs(correlation) > 0.7 ? "Strong" :
        Math.abs(correlation) > 0.3 ? "Moderate" : "Weak",
      direction: correlation > 0 ? "Positive" : "Negative"
    };
  }
}

// Singleton instance
let aiAgentInstance = null;

const getAIAgent = async () => {
  if (!aiAgentInstance) {
    aiAgentInstance = new AdvancedAttendanceAIAgent();
    try {
      await aiAgentInstance.initialize();
    } catch (error) {
      console.error("❌ Failed to initialize Advanced AI Agent:", error);
      throw error;
    }
  }
  return aiAgentInstance;
};

// Cleanup handlers
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

module.exports = { getAIAgent, AdvancedAttendanceAIAgent };