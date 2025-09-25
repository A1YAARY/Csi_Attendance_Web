const Attendance = require("../models/Attendance.models");
const DailyTimeSheet = require("../models/DailyTimeSheet.models");
const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");
const User = require("../models/user.models");
const holidayService = require("../utils/holidayService");
const geolib = require("geolib");

// IST helper functions
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const startOfISTDay = (date = new Date()) => {
  const d = getISTDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

const endOfISTDay = (date = new Date()) => {
  const d = getISTDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};

const formatISTDate = (date) => {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Enhanced location spoofing detection
const detectLocationSpoofing = (location, userAgent, deviceInfo) => {
  const suspiciousIndicators = [];

  // Check for unrealistic accuracy
  if (location.accuracy && location.accuracy < 1) {
    suspiciousIndicators.push("Unrealistic GPS accuracy");
  }

  // Check for mock location apps in user agent
  const mockLocationKeywords = ['mock', 'fake', 'spoof', 'simulator'];
  if (userAgent && mockLocationKeywords.some(keyword =>
    userAgent.toLowerCase().includes(keyword))) {
    suspiciousIndicators.push("Mock location app detected");
  }

  // Check for developer options indicators
  if (deviceInfo && (
    deviceInfo.developmentSettingsEnabled ||
    deviceInfo.mockLocationEnabled
  )) {
    suspiciousIndicators.push("Developer options enabled");
  }

  return {
    isSuspicious: suspiciousIndicators.length > 0,
    indicators: suspiciousIndicators
  };
};

const calculateWorkingTime = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  return Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000);
};

const updateDailyTimeSheet = async (userId, organizationId, attendance) => {
  const dayStart = startOfISTDay();
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
      checkIn: {
        time: getISTDate(attendance.createdAt),
        attendanceId: attendance._id,
      },
    });
  } else if (attendance.type === "check-out") {
    const last = sheet.sessions[sheet.sessions.length - 1];
    if (last && !last.checkOut?.time) {
      last.checkOut = {
        time: getISTDate(attendance.createdAt),
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

  try {
    await sheet.save();
    console.log(`TimeSheet updated for user ${userId}, type: ${attendance.type}`);
    return sheet;
  } catch (error) {
    console.error('TimeSheet save error:', error);
    throw error;
  }
};

// Enhanced QR scanning with comprehensive security - FIXED VERSION
exports.scanQRCode = async (req, res) => {
  try {
    const userOrgId = (
      req.user.organizationId?._id ?? req.user.organizationId
    )?.toString();
    
    const body = req.body || {};
    const code = body.code || body.qrCode || body.token;
    const reqType = body.type || body.qrType;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: code"
      });
    }

    // Validate user location is provided
    if (!body.location || !body.location.latitude || !body.location.longitude) {
      return res.status(400).json({
        success: false,
        message: "Current location is required for attendance",
        code: "LOCATION_REQUIRED"
      });
    }

    // Get organization
    const org = await Organization.findById(userOrgId);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    // Device verification for users
    const user = await User.findById(req.user._id);
    if (user.role === "user") {
      // Check device registration
      if (!user.deviceInfo.isRegistered) {
        return res.status(403).json({
          success: false,
          message: "Device not registered. Please contact admin.",
          code: "DEVICE_NOT_REGISTERED"
        });
      }

      // Check device ID
      const currentDeviceId = body.deviceInfo?.deviceId || req.headers['x-device-id'];
      if (!currentDeviceId || currentDeviceId !== user.deviceInfo.deviceId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized device. Please use your registered device or request device change.",
          code: "UNAUTHORIZED_DEVICE",
          registeredDevice: user.deviceInfo.deviceId,
          currentDevice: currentDeviceId
        });
      }
    }

    // Resolve QR
    let qr = null;
    if (reqType && ["check-in", "check-out"].includes(reqType)) {
      qr = await QRCode.findOne({
        organizationId: userOrgId,
        code,
        qrType: reqType,
        active: true,
      });
    }

    if (!qr) {
      qr = await QRCode.findOne({ code, active: true });
      if (!qr) {
        return res.status(404).json({
          success: false,
          message: "QR code not found or inactive"
        });
      }
    }

    if (qr.organizationId?.toString() !== userOrgId) {
      return res.status(403).json({
        success: false,
        message: "QR code belongs to another organization",
      });
    }

    const type = qr.qrType;

    // FIXED: Business rule validation using actual attendance records
    const dayStart = startOfISTDay();
    const dayEnd = endOfISTDay();

    // Get today's attendance records directly from database
    const todaysAttendance = await Attendance.find({
      userId: req.user._id,
      organizationId: userOrgId,
      istTimestamp: { $gte: dayStart, $lte: dayEnd }
    }).sort({ istTimestamp: -1 });

    // Determine session status from actual attendance records
    let hasOpenSession = false;
    let lastCheckInTime = null;
    let lastCheckOutTime = null;

    if (todaysAttendance.length > 0) {
      const lastCheckIn = todaysAttendance.find(record => record.type === 'check-in');
      const lastCheckOut = todaysAttendance.find(record => record.type === 'check-out');
      
      lastCheckInTime = lastCheckIn ? lastCheckIn.istTimestamp : null;
      lastCheckOutTime = lastCheckOut ? lastCheckOut.istTimestamp : null;
      
      // User has an open session if they checked in and haven't checked out, 
      // OR their last check-in is more recent than their last check-out
      hasOpenSession = lastCheckInTime && (!lastCheckOutTime || lastCheckInTime > lastCheckOutTime);
    }

    console.log('🔍 Session validation debug:', {
      userId: req.user._id,
      type,
      hasOpenSession,
      todaysAttendanceCount: todaysAttendance.length,
      lastCheckIn: lastCheckInTime,
      lastCheckOut: lastCheckOutTime
    });

    if (type === "check-in" && hasOpenSession) {
      return res.status(409).json({
        success: false,
        message: "Already checked in. Please check out before checking in again.",
        debug: {
          lastCheckIn: lastCheckInTime,
          lastCheckOut: lastCheckOutTime
        }
      });
    }

    if (type === "check-out" && !hasOpenSession) {
      return res.status(409).json({
        success: false,
        message: "No active check-in found. Please check in first.",
        debug: {
          lastCheckIn: lastCheckInTime,
          lastCheckOut: lastCheckOutTime,
          todaysRecords: todaysAttendance.length
        }
      });
    }

    // Expiry check using IST
    const nowSec = Math.floor(getISTDate().getTime() / 1000);
    const maxAge = 999999999;
    const qrCodeValid =
      typeof qr.timestamp === "number" ? nowSec - qr.timestamp <= maxAge : true;

    if (!qrCodeValid) {
      return res.status(400).json({
        success: false,
        message: "QR code has expired. Please request a new QR code.",
        code: "QR_EXPIRED"
      });
    }

    // Enhanced location validation
    const userLocation = {
      latitude: Number(body.location.latitude),
      longitude: Number(body.location.longitude),
      accuracy: Number(body.location.accuracy ?? 0),
    };

    // Check distance from organization location
    const orgLocation = {
      latitude: Number(org.location.latitude),
      longitude: Number(org.location.longitude),
    };

    const distance = geolib.getDistance(orgLocation, userLocation);
    const allowedRadius = org.settings?.locationToleranceMeters ?? 100;
    const locationMatch = distance <= allowedRadius;

    if (!locationMatch) {
      return res.status(403).json({
        success: false,
        message: `You are not within the organization premises. You are ${distance} meters away, but must be within ${allowedRadius} meters.`,
        code: "LOCATION_OUT_OF_RANGE",
        data: {
          currentDistance: distance,
          allowedRadius,
          organizationLocation: {
            latitude: org.location.latitude,
            longitude: org.location.longitude,
            address: org.location.address
          }
        }
      });
    }

    // Location spoofing detection
    const spoofingCheck = detectLocationSpoofing(
      body.location,
      req.headers["user-agent"],
      body.deviceInfo
    );

    // If strict verification is enabled and spoofing is detected
    if (org.settings?.strictLocationVerification && spoofingCheck.isSuspicious) {
      return res.status(403).json({
        success: false,
        message: "Potential location spoofing detected. Please try again with legitimate location.",
        code: "LOCATION_SPOOFING_DETECTED",
        indicators: spoofingCheck.indicators
      });
    }

    const verified = qrCodeValid && locationMatch && !spoofingCheck.isSuspicious;

    // Create attendance record with IST and enhanced verification
    const attendance = await Attendance.create({
      userId: req.user._id,
      organizationId: userOrgId,
      qrCodeId: qr._id,
      type,
      istTimestamp: getISTDate(),
      location: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
      },
      deviceInfo: {
        deviceId: body.deviceInfo?.deviceId || req.headers['x-device-id'],
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
        spoofingDetected: spoofingCheck.isSuspicious,
        distance: distance,
        spoofingIndicators: spoofingCheck.indicators
      },
    });

    // Update QR usage count
    await QRCode.updateOne({ _id: qr._id }, { $inc: { usageCount: 1 } });

    // Update user's last known location
    if (user.role === "user") {
      user.deviceInfo.lastKnownLocation = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
        timestamp: getISTDate()
      };
      await user.save();
    }

    const timeSheet = await updateDailyTimeSheet(
      req.user._id,
      userOrgId,
      attendance
    );

    return res.json({
      success: true,
      message: type === "check-in" ? "Checked in successfully" : "Checked out successfully",
      data: {
        attendanceId: attendance._id,
        verified,
        timestamp: formatISTDate(attendance.istTimestamp),
        location: {
          distance: distance,
          withinRange: locationMatch,
        },
        dailySummary: {
          totalMinutes: timeSheet.totalWorkingTime || 0,
          status: timeSheet.status,
          sessions: (timeSheet.sessions || []).length,
        },
      },
    });

  } catch (err) {
    console.error("scanQRCode error", err);
    return res.status(500).json({
      success: false,
      message: "Failed to scan QR code"
    });
  }
};

// Get User Past Attendance with IST
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

    // Format with IST timestamps
    const formattedAttendance = attendance.map((record) => {
      const obj = record.toObject();
      obj.istTimestampFormatted = formatISTDate(
        record.istTimestamp || record.createdAt
      );
      obj.createdAtISTFormatted = formatISTDate(record.createdAt);
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

// Get Daily Report with IST
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const orgId = req.user.organizationId;
    const reportDate = date ? new Date(date) : getISTDate();
    const startOfDay = startOfISTDay(reportDate);
    const endOfDay = endOfISTDay(reportDate);

    const dailyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate("userId", "name email institute department");

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
        deviceRegistered: user.deviceInfo.isRegistered || false
      });
    });

    dailyReports.forEach((report) => {
      if (reportMap.has(report.userId._id.toString())) {
        const existing = reportMap.get(report.userId._id.toString());
        reportMap.set(report.userId._id.toString(), {
          ...existing,
          totalWorkingTime: report.totalWorkingTime,
          status: report.status,
          sessions: report.sessions.length,
        });
      }
    });

    const finalReport = Array.from(reportMap.values());

    res.json({
      success: true,
      date: formatISTDate(startOfDay),
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

// Get Weekly Report with IST
exports.getWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId;
    const start = startDate ? new Date(startDate) : getISTDate();

    // Adjust to IST week start
    const istStart = startOfISTDay(start);
    istStart.setDate(istStart.getDate() - istStart.getDay()); // Start of week (Sunday)
    const istEnd = new Date(istStart);
    istEnd.setDate(istEnd.getDate() + 6); // End of week (Saturday)
    istEnd.setHours(23, 59, 59, 999);

    const weeklyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: istStart, $lte: istEnd },
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
      for (let d = new Date(istStart); d <= istEnd; d.setDate(d.getDate() + 1)) {
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
      weekStart: formatISTDate(istStart),
      weekEnd: formatISTDate(istEnd),
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

// Check working day with IST
exports.checkWorkingDay = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required (YYYY-MM-DD)"
      });
    }

    const checkDate = new Date(date);
    const istDate = getISTDate(checkDate);
    const workingDay = await holidayService.isWorkingDay(istDate);

    res.json({
      success: true,
      date: formatISTDate(istDate),
      originalDate: date,
      workingDay,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
};

module.exports = {
  getUserPastAttendance: exports.getUserPastAttendance,
  scanQRCode: exports.scanQRCode,
  getDailyReport: exports.getDailyReport,
  getWeeklyReport: exports.getWeeklyReport,
  checkWorkingDay: exports.checkWorkingDay,
};
