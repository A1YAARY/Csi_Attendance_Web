const Attendance = require("../models/Attendance.models");
const DailyTimeSheet = require("../models/DailyTimeSheet.models");
const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");
const User = require("../models/user.models");

// 🔥 Helper function to calculate working time
const calculateWorkingTime = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  return Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000); // minutes
};

// 🔥 Helper function to get IST date
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

// 🔥 Update or create daily timesheet
const updateDailyTimeSheet = async (userId, organizationId, attendance) => {
  const todayIST = getISTDate();
  const startOfDay = new Date(
    todayIST.getFullYear(),
    todayIST.getMonth(),
    todayIST.getDate(),
    todayIST.getDay()
  );

  let timeSheet = await DailyTimeSheet.findOne({
    userId,
    organizationId,
    date: startOfDay,
  });

  if (!timeSheet) {
    timeSheet = new DailyTimeSheet({
      userId,
      organizationId,
      date: startOfDay,
      sessions: [],
    });
  }

  if (attendance.type === "check-in") {
    // Start new session
    timeSheet.sessions.push({
      checkIn: {
        time: attendance.createdAt,
        attendanceId: attendance._id,
      },
    });
  } else if (attendance.type === "check-out") {
    // Complete the last incomplete session
    const lastSession = timeSheet.sessions[timeSheet.sessions.length - 1];
    if (lastSession && !lastSession.checkOut.time) {
      lastSession.checkOut = {
        time: attendance.createdAt,
        attendanceId: attendance._id,
      };
      lastSession.duration = calculateWorkingTime(
        lastSession.checkIn.time,
        lastSession.checkOut.time
      );
    }
  }

  // Calculate total working time
  timeSheet.totalWorkingTime = timeSheet.sessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);

  // Determine status
  const requiredHours = timeSheet.requiredWorkingHours || 480; // 8 hours
  if (timeSheet.totalWorkingTime === 0) {
    timeSheet.status = "absent";
  } else if (timeSheet.totalWorkingTime < requiredHours / 2) {
    timeSheet.status = "half-day";
  } else {
    timeSheet.status = "full-day";
  }

  await timeSheet.save();
  return timeSheet;
};

// 🔥 Scan QR Code (Fixed)
exports.scanQRCode = async (req, res) => {
  try {
    console.log("📍 Scan request received:", {
      body: req.body,
      user: req.user?.email,
      timestamp: new Date().toISOString(),
    });

    const { code, location, type, deviceInfo } = req.body;
    const user = req.user;

    // Basic validation
    if (!code || !type) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields: code and type",
        required: ["code", "type"],
      });
    }

    if (!["check-in", "check-out"].includes(type)) {
      console.log("❌ Invalid type:", type);
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'check-in' or 'check-out'",
      });
    }

    // Check last attendance for the day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const lastAttendance = await Attendance.findOne({
      userId: user._id,
      createdAt: { $gte: todayStart },
    }).sort({ createdAt: -1 });

    // Prevent duplicate check-ins/check-outs
    if (lastAttendance && lastAttendance.type === type) {
      console.log("❌ Duplicate scan attempt");
      return res.status(400).json({
        success: false,
        message: `You are already ${
          type === "check-in" ? "checked in" : "checked out"
        }. Please ${type === "check-in" ? "check out" : "check in"} first.`,
      });
    }

    if (!lastAttendance && type === "check-out") {
      console.log("❌ Checkout without checkin");
      return res.status(400).json({
        success: false,
        message: "Cannot check-out without checking in first today.",
      });
    }

    // Verify QR code
    const qr = await QRCode.findOne({ code, active: true });
    if (!qr) {
      console.log("❌ Invalid QR code:", code);
      return res.status(400).json({
        success: false,
        message: "Invalid or expired QR code",
      });
    }

    // Verify organization
    if (String(user.organizationId) !== String(qr.organizationId)) {
      console.log("❌ Organization mismatch");
      return res.status(403).json({
        success: false,
        message: "QR code doesn't belong to your organization",
      });
    }

    // Verify QR type matches request type
    if (qr.qrType !== type) {
      console.log("❌ QR type mismatch");
      return res.status(400).json({
        success: false,
        message: `This is a ${qr.qrType} QR code, but you're trying to ${type}`,
      });
    }

    // Use safe location
    const safeLocation =
      location && location.latitude && location.longitude
        ? location
        : { latitude: 0, longitude: 0, accuracy: 0 };

    console.log("✅ Creating attendance record");

    // Create attendance record
    const record = await Attendance.create({
      userId: user._id,
      organizationId: qr.organizationId,
      qrCodeId: qr._id,
      type,
      location: safeLocation,
      deviceInfo: deviceInfo || {},
      verified: true,
      verificationDetails: {
        locationMatch: true,
        qrCodeValid: true,
        timeValid: true,
        deviceTrusted: true,
        spoofingDetected: false,
      },
    });

    console.log("✅ Attendance record created:", record._id);

    // Update daily timesheet
    const timeSheet = await updateDailyTimeSheet(
      user._id,
      qr.organizationId,
      record
    );

    // Update user activity
    user.lastActivity = type === "check-in";
    await user.save();

    // Update QR usage count
    qr.usageCount += 1;
    await qr.save();

    // Format response
    const istOffset = 5.5 * 60 * 60 * 1000;
    const recordObj = record.toObject();
    recordObj.createdAtIST = new Date(record.createdAt.getTime() + istOffset);

    console.log("✅ Sending success response");

    return res.status(200).json({
      success: true,
      message: `${
        type === "check-in" ? "Checked in" : "Checked out"
      } successfully`,
      attendance: recordObj,
      dailyStatus: {
        totalWorkingTime:
          Math.floor(timeSheet.totalWorkingTime / 60) +
          "h " +
          (timeSheet.totalWorkingTime % 60) +
          "m",
        status: timeSheet.status,
        sessions: timeSheet.sessions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in scanQRCode:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process attendance scan",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// 🔥 Get User Past Attendance
exports.getUserPastAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const attendance = await Attendance.find({ userId })
      .populate("qrCodeId", "qrType")
      .populate("organizationId", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Add IST timestamps
    const formattedAttendance = attendance.map((record) => {
      const istOffset = 5.5 * 60 * 60 * 1000;
      const obj = record.toObject();
      obj.createdAtIST = new Date(record.createdAt.getTime() + istOffset);
      return obj;
    });

    const total = await Attendance.countDocuments({ userId });

    res.json({
      success: true,
      attendance: formattedAttendance,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + attendance.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching user attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
    });
  }
};

// 🔥 Upload Attendance File
exports.uploadAttendanceFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        url: req.file.path,
      },
    });
  } catch (error) {
    console.error("Error uploading attendance file:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
    });
  }
};

// 🔥 Get Daily Report
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const orgId = req.user.organizationId;
    const reportDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth(),
      reportDate.getDate(),
      reportDate.getDay(),
    );

    const dailyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: startOfDay,
    }).populate("userId", "name email institute department");

    // Get all users in organization
    const allUsers = await User.find({ organizationId: orgId, role: "user" });

    // Create report with absent users
    const reportMap = new Map();
    allUsers.forEach((user) => {
      reportMap.set(user._id.toString(), {
        userId: user._id,
        name: user.name,
        email: user.email,
        institute: user.institute,
        department: user.department,
        totalWorkingTime: 0,
        status: "absent",
        sessions: [],
      });
    });

    dailyReports.forEach((report) => {
      if (reportMap.has(report.userId._id.toString())) {
        reportMap.set(report.userId._id.toString(), {
          userId: report.userId._id,
          name: report.userId.name,
          email: report.userId.email,
          institute: report.userId.institute,
          department: report.userId.department,
          totalWorkingTime: report.totalWorkingTime,
          status: report.status,
          sessions: report.sessions.length,
        });
      }
    });

    const finalReport = Array.from(reportMap.values());

    res.json({
      success: true,
      date: startOfDay,
      totalEmployees: allUsers.length,
      present: finalReport.filter((r) => r.status !== "absent").length,
      absent: finalReport.filter((r) => r.status === "absent").length,
      fullDay: finalReport.filter((r) => r.status === "full-day").length,
      halfDay: finalReport.filter((r) => r.status === "half-day").length,
      employees: finalReport,
    });
  } catch (error) {
    console.error("Error generating daily report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate daily report",
    });
  }
};

// 🔥 Get Weekly Report
exports.getWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId;
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6); // End of week (Saturday)
    end.setHours(23, 59, 59, 999);

    const weeklyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: start, $lte: end },
    }).populate("userId", "name email institute department");

    const allUsers = await User.find({ organizationId: orgId, role: "user" });

    // Create weekly summary
    const userSummary = {};
    allUsers.forEach((user) => {
      userSummary[user._id.toString()] = {
        name: user.name,
        email: user.email,
        institute: user.institute,
        department: user.department,
        days: {},
        totalHours: 0,
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        fullDays: 0,
      };

      // Initialize all days as absent
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split("T")[0];
        userSummary[user._id.toString()].days[dateKey] = {
          status: "absent",
          workingTime: 0,
          sessions: 0,
        };
      }
    });

    // Fill in actual data
    weeklyReports.forEach((report) => {
      const userId = report.userId._id.toString();
      const dateKey = report.date.toISOString().split("T")[0];
      if (userSummary[userId]) {
        userSummary[userId].days[dateKey] = {
          status: report.status,
          workingTime: report.totalWorkingTime,
          sessions: report.sessions.length,
        };
        userSummary[userId].totalHours += report.totalWorkingTime;
        if (report.status === "full-day") userSummary[userId].fullDays++;
        else if (report.status === "half-day") userSummary[userId].halfDays++;
        else if (report.status === "absent") userSummary[userId].absentDays++;
        if (report.status !== "absent") userSummary[userId].presentDays++;
      }
    });

    // Count absent days
    Object.keys(userSummary).forEach((userId) => {
      const user = userSummary[userId];
      user.absentDays = 7 - user.presentDays;
    });

    res.json({
      success: true,
      weekStart: start,
      weekEnd: end,
      summary: userSummary,
    });
  } catch (error) {
    console.error("Error generating weekly report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate weekly report",
    });
  }
};

module.exports = {
  getUserPastAttendance: exports.getUserPastAttendance,
  scanQRCode: exports.scanQRCode,
  uploadAttendanceFile: exports.uploadAttendanceFile,
  getDailyReport: exports.getDailyReport,
  getWeeklyReport: exports.getWeeklyReport,
};
