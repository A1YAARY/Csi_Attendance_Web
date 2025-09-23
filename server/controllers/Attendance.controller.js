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

const startOfISTDay = (date = new Date()) => {
  const d = getISTDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

// const calculateWorkingTime = (checkIn, checkOut) => {
//   if (!checkIn || !checkOut) return 0;
//   return Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000);
// };

const updateDailyTimeSheet = async (userId, organizationId, attendance) => {
  const todayIST = getISTDate();
  const startOfDay = new Date(
    todayIST.getFullYear(),
    todayIST.getMonth(),
    todayIST.getDate(),
    todayIST.getDay()
  );

  let sheet = await DailyTimeSheet.findOne({
    userId,
    organizationId,
    date: dayStart,
  });
  if (!sheet) {
    sheet = new DailyTimeSheet({
      userId,
      organizationId,
      date: dayStart,
      sessions: [],
      totalWorkingTime: 0,
      status: "absent",
    });
  }

  if (attendance.type === "check-in") {
    sheet.sessions.push({
      checkIn: { time: attendance.createdAt, attendanceId: attendance._id },
    });
  } else if (attendance.type === "check-out") {
    const last = sheet.sessions[sheet.sessions.length - 1];
    if (last && !last.checkOut?.time) {
      last.checkOut = {
        time: attendance.createdAt,
        attendanceId: attendance._id,
      };
      last.duration = Math.floor(
        (new Date(last.checkOut.time) - new Date(last.checkIn.time)) / 60000
      );
    }
  }

  sheet.totalWorkingTime = (sheet.sessions || []).reduce(
    (sum, s) => sum + (s.duration || 0),
    0
  );

  const requiredMinutes = sheet.requiredWorkingHours || 480;
  sheet.status =
    sheet.totalWorkingTime === 0
      ? "absent"
      : sheet.totalWorkingTime < requiredMinutes / 2
      ? "half-day"
      : "full-day";

  await sheet.save();
  return sheet;
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

<<<<<<< HEAD
    console.log("✅ Creating attendance record");

    // Create attendance record
    const record = await Attendance.create({
      userId: user._id,
      organizationId: qr.organizationId,
=======
    let locationMatch = true;
    if (
      qr.location?.latitude &&
      qr.location?.longitude &&
      safeLocation.latitude &&
      safeLocation.longitude
    ) {
      const distance = geolib.getDistance(
        {
          latitude: Number(qr.location.latitude),
          longitude: Number(qr.location.longitude),
        },
        {
          latitude: Number(safeLocation.latitude),
          longitude: Number(safeLocation.longitude),
        }
      );
      const tolerance = org.settings?.locationToleranceMeters ?? 50;
      locationMatch = Number.isFinite(distance) ? distance <= tolerance : true;
    }
    const verified = qrCodeValid && locationMatch;
 
    // Persist attendance
    const attendance = await Attendance.create({
      userId: req.user._id,
      organizationId: userOrgId,
>>>>>>> 019be5ea376a10f2999fb46db830a912249107cc
      qrCodeId: qr._id,
      type,
      location: safeLocation,
      deviceInfo: {
        deviceId: body.deviceInfo?.deviceId,
        platform: body.deviceInfo?.platform,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        fingerprint: body.deviceInfo?.fingerprint,
      },
      verified,
      verificationDetails: {
        locationMatch,
        qrCodeValid,
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

    return res.json({
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
// get user attendance.  
// 🔥 Get User Past Attendance
const getUserPastAttendance = async (req, res) => {
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

    res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Error fetching user attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
    });
  }
};

// 🔥 Get Daily Report (JSON)
const getDailyReport = async (req, res) => {
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

    const allUsers = await User.find({ organizationId: orgId, role: "user" });

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
    });

    res.json({
      success: true,
      date: startOfDay,
      employees: Array.from(reportMap.values()),
    });
  } catch (error) {
    console.error("Error generating daily report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate daily report",
    });
  }
};

// 🔥 Get Weekly Report (JSON)
const getWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId;
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weeklyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: start, $lte: end },
    }).populate("userId", "name email institute department");

    res.json({
      success: true,
      weekStart: start,
      weekEnd: end,
      reports: weeklyReports,
    });
  } catch (error) {
    console.error("Error generating weekly report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate weekly report",
    });
  }
};

// 🔥 Download Daily Report (XLSX)
const downloadDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const orgId = req.user.organizationId;
    const reportDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth(),
      reportDate.getDate()
    );

    const dailyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: startOfDay,
    }).populate("userId", "name email institute department");

    const allUsers = await User.find({ organizationId: orgId, role: "user" });

    const reportMap = new Map();
    allUsers.forEach((user) => {
      reportMap.set(user._id.toString(), {
        name: user.name,
        email: user.email,
        institute: user.institute,
        department: user.department,
        totalWorkingTime: 0,
        status: "absent",
        sessions: 0,
      });
    });

    dailyReports.forEach((report) => {
      reportMap.set(report.userId._id.toString(), {
        name: report.userId.name,
        email: report.userId.email,
        institute: report.userId.institute,
        department: report.userId.department,
        totalWorkingTime: report.totalWorkingTime,
        status: report.status,
        sessions: report.sessions.length,
      });
    });

    const finalReport = Array.from(reportMap.values());

    const ws = XLSX.utils.json_to_sheet(finalReport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="daily_report_${startOfDay
        .toISOString()
        .split("T")[0]}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading daily report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download daily report",
    });
  }
};

// 🔥 Download Weekly Report (XLSX)
const downloadWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId;
    const start = startDate ? new Date(startDate) : new Date();

    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weeklyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: start, $lte: end },
    }).populate("userId", "name email institute department");

    const allUsers = await User.find({ organizationId: orgId, role: "user" });

    const userSummary = {};
    allUsers.forEach((user) => {
      userSummary[user._id.toString()] = {
        name: user.name,
        email: user.email,
        institute: user.institute,
        department: user.department,
        totalHours: 0,
        presentDays: 0,
        halfDays: 0,
        fullDays: 0,
        absentDays: 0,
      };
    });

    weeklyReports.forEach((report) => {
      const userId = report.userId._id.toString();
      if (userSummary[userId]) {
        userSummary[userId].totalHours += report.totalWorkingTime;
        if (report.status === "full-day") userSummary[userId].fullDays++;
        else if (report.status === "half-day") userSummary[userId].halfDays++;
        else if (report.status === "absent") userSummary[userId].absentDays++;
        if (report.status !== "absent") userSummary[userId].presentDays++;
      }
    });

    const finalReport = Object.values(userSummary);

    const ws = XLSX.utils.json_to_sheet(finalReport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="weekly_report_${start
        .toISOString()
        .split("T")[0]}_${end.toISOString().split("T")[0]}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading weekly report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download weekly report",
    });
  }
};

module.exports = {
  scanQRCode,
  getUserPastAttendance,
  getDailyReport,
  getWeeklyReport,
  downloadDailyReport,
  downloadWeeklyReport,
};
