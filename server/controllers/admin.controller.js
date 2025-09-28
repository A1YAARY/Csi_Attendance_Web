const User = require("../models/user.models");
const Attendance = require("../models/Attendance.models");
const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");
const DailyTimeSheet = require("../models/DailyTimeSheet.models");
const holidayService = require("../utils/holidayService");
const DateTimeUtils = require("../utils/dateTimeUtils");
const istUtils = require("../utils/istDateTimeUtils"); // Using ONLY your IST utils
const Notification = require("../models/Notification.models");
// Reset user device (allow user to register new device)
const resetUserDevice = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    if (req.user.role !== "organization") {
      if (String(req.user._id) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Only admins can reset user devices" });
      }
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let adminOrgId = req.user.organizationId;
    if (req.user.role === "organization" && !adminOrgId) {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({ success: false, message: "Admin has no organization" });
      }
      adminOrgId = org._id;
    }

    targetUser.deviceInfo = {
      isRegistered: false,
      deviceId: null,
      deviceType: null,
      deviceFingerprint: null,
      registeredAt: null,
      lastKnownLocation: null,
    };

    await targetUser.save();

    const resetTime = istUtils.getISTDate();
    return res.json({
      success: true,
      message: "User device reset successfully. User can now register a new device.",
      data: {
        userId: targetUser._id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        deviceInfo: targetUser.deviceInfo,
        resetAt: resetTime,
        resetAtFormatted: istUtils.formatISTTimestamp(resetTime),
      },
    });
  } catch (error) {
    console.error("Error resetting user device:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset user device",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getusers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    let orgId = req.user.organizationId;
    if (req.user.role === "organization" && !orgId) {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({ success: false, message: "Admin has no organization" });
      }
      orgId = org._id;
    }

    if (!orgId) {
      return res.status(400).json({ success: false, message: "No organization scope" });
    }

    const users = await User.find({ organizationId: orgId })
      .select("-password -refreshToken")
      .lean()
      .sort({ createdAt: -1 });

    const formatted = users.map(u => ({
      _id: u._id,
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role || "user",
      department: u.department || "cmpn",
      phone: u.phone || "",
      institute: u.institute || "",
      workingHours: u.workingHours || { start: "09:00", end: "17:00" },
      weeklySchedule: u.weeklySchedule,
      customHolidays: u.customHolidays || [],
      deviceInfo: u.deviceInfo || {
        isRegistered: false,
        deviceId: null,
        deviceType: null,
        deviceFingerprint: null,
        registeredAt: null,
      },
      organizationId: u.organizationId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      createdAtFormatted: u.createdAt ? istUtils.formatISTTimestamp(u.createdAt) : "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get device change requests
const getDeviceChangeRequests = async (req, res) => {
  try {
    let adminOrgId;
    if (req.user.organizationId) {
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        adminOrgId = req.user.organizationId._id;
      } else {
        adminOrgId = req.user.organizationId;
      }
    } else {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({
          success: false,
          message: "Admin has no organization"
        });
      }
      adminOrgId = org._id;
    }

    const usersWithRequests = await User.find({
      organizationId: adminOrgId,
      "deviceChangeRequest.status": "pending",
    }).select("name email deviceInfo deviceChangeRequest").lean();

    const requests = usersWithRequests.map((user) => ({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      currentDevice: user.deviceInfo?.deviceId,
      newDeviceId: user.deviceChangeRequest?.newDeviceId,
      newDeviceType: user.deviceChangeRequest?.newDeviceType,
      requestedAt: user.deviceChangeRequest?.requestedAt,
      requestedAtIST: user.deviceChangeRequest?.requestedAt
        ? istUtils.formatISTTimestamp(user.deviceChangeRequest.requestedAt)
        : null,
    }));

    res.json({
      success: true,
      message: "Device change requests fetched successfully",
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching device change requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch device change requests",
    });
  }
};


// Handle device change request (approve/reject)
const handleDeviceChangeRequest = async (req, res) => {
  try {
    const { userId, action, reason } = req.body;

    if (!userId || !action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "User ID and valid action (approve/reject) are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to handle this request",
      });
    }

    if (!user.deviceChangeRequest || user.deviceChangeRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending device change request found for this user",
      });
    }

    if (action === "approve") {
      user.deviceInfo = {
        deviceId: user.deviceChangeRequest.newDeviceId,
        deviceType: user.deviceChangeRequest.newDeviceType,
        deviceFingerprint: user.deviceChangeRequest.newDeviceFingerprint,
        isRegistered: true,
        registeredAt: DateTimeUtils.getISTDate(),
      };
    }

    user.deviceChangeRequest.status = action === "approve" ? "approved" : "rejected";
    user.deviceChangeRequest.adminResponse = {
      adminId: req.user._id,
      respondedAt: DateTimeUtils.getISTDate(),
      reason: reason || "",
    };

    await user.save();

    res.json({
      success: true,
      message: `Device change request ${action}d successfully`,
      data: {
        userId: user._id,
        action,
        newDeviceId: action === "approve" ? user.deviceInfo.deviceId : null,
        respondedAt: user.deviceChangeRequest.adminResponse.respondedAt,
      },
    });
  } catch (error) {
    console.error("Error handling device change request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to handle device change request",
    });
  }
};


// Get admin notifications
const getNotifications = async (req, res) => {
  try {
    const { limit = 50, onlyUnread = false, type } = req.query;

    let adminOrgId;
    if (req.user.organizationId) {
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        adminOrgId = req.user.organizationId._id;
      } else {
        adminOrgId = req.user.organizationId;
      }
    } else {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({
          success: false,
          message: "Admin has no organization"
        });
      }
      adminOrgId = org._id;
    }

    const query = { organizationId: adminOrgId };
    if (onlyUnread === 'true') {
      query.isRead = false;
    }
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('userId', 'name email department phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      priority: notification.priority,
      createdAt: notification.createdAt,
      createdAtIST: istUtils.formatISTTimestamp(notification.createdAt),
      readAt: notification.readAt,
      readAtIST: notification.readAt ? istUtils.formatISTTimestamp(notification.readAt) : null,
      user: notification.userId ? {
        _id: notification.userId._id,
        name: notification.userId.name,
        email: notification.userId.email,
        department: notification.userId.department,
        phone: notification.userId.phone
      } : null
    }));

    const unreadCount = await Notification.countDocuments({
      organizationId: adminOrgId,
      isRead: false
    });

    res.json({
      success: true,
      data: formattedNotifications,
      count: formattedNotifications.length,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
};


const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    let adminOrgId;
    if (req.user.organizationId) {
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        adminOrgId = req.user.organizationId._id;
      } else {
        adminOrgId = req.user.organizationId;
      }
    } else {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({
          success: false,
          message: "Admin has no organization"
        });
      }
      adminOrgId = org._id;
    }

    const readTime = istUtils.getISTDate();
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, organizationId: adminOrgId },
      {
        isRead: true,
        readAt: readTime
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      data: {
        _id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt,
        readAtIST: istUtils.formatISTTimestamp(notification.readAt)
      }
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    let adminOrgId;
    if (req.user.organizationId) {
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        adminOrgId = req.user.organizationId._id;
      } else {
        adminOrgId = req.user.organizationId;
      }
    } else {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({
          success: false,
          message: "Admin has no organization"
        });
      }
      adminOrgId = org._id;
    }

    const readTime = istUtils.getISTDate();
    const result = await Notification.updateMany(
      { organizationId: adminOrgId, isRead: false },
      {
        isRead: true,
        readAt: readTime
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read"
    });
  }
};

// Enhanced records function with comprehensive data
const records = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    const { date, userId } = req.query;
    const selectedDate = date ? new Date(date) : istUtils.getISTDate();
    const startOfDay = istUtils.getStartOfDayIST(selectedDate);
    const endOfDay = istUtils.getEndOfDayIST(selectedDate);

    let query = {
      organizationId: orgId,
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    if (userId) {
      query.userId = userId;
    }

    const dailyTimesheets = await DailyTimeSheet.find(query)
      .populate("userId", "name email department institute role workingHours")
      .sort({ "userId.name": 1 })
      .lean();

    const allUsers = await User.find({ organizationId: orgId, role: "user" })
      .select("name email department institute workingHours")
      .lean();

    const userMap = new Map();

    allUsers.forEach(user => {
      userMap.set(user._id.toString(), {
        userId: user._id,
        name: user.name,
        email: user.email,
        department: user.department || "General",
        institute: user.institute || "",
        workingHours: user.workingHours || { start: "09:00", end: "17:00" },
        status: "absent",
        firstCheckIn: null,
        lastCheckOut: null,
        totalWorkingMinutes: 0,
        totalSessions: 0,
        isLate: false,
        isEarlyDeparture: false,
        isHalfDay: false,
      });
    });

    dailyTimesheets.forEach(sheet => {
      const userId = sheet.userId._id.toString();
      if (userMap.has(userId)) {
        const user = userMap.get(userId);
        const sessions = sheet.sessions || [];

        if (sessions.length > 0) {
          const checkIns = sessions.filter(s => s.checkIn?.time).map(s => s.checkIn.time);
          const checkOuts = sessions.filter(s => s.checkOut?.time).map(s => s.checkOut.time);

          user.firstCheckIn = checkIns.length > 0 ? new Date(Math.min(...checkIns.map(d => new Date(d)))) : null;
          user.lastCheckOut = checkOuts.length > 0 ? new Date(Math.max(...checkOuts.map(d => new Date(d)))) : null;
        }

        user.totalWorkingMinutes = sheet.totalWorkingTime || 0;
        user.totalSessions = sessions.length;
        user.status = sheet.status || "absent";

        if (user.firstCheckIn) {
          const expectedStart = new Date(user.firstCheckIn);
          const [startHour, startMinute] = (user.workingHours.start || "09:00").split(':');
          expectedStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
          user.isLate = user.firstCheckIn > expectedStart;
        }

        if (user.lastCheckOut && user.status !== "absent") {
          const expectedEnd = new Date(user.lastCheckOut);
          const [endHour, endMinute] = (user.workingHours.end || "17:00").split(':');
          expectedEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
          user.isEarlyDeparture = user.lastCheckOut < expectedEnd;
        }

        user.isHalfDay = user.totalWorkingMinutes > 0 && user.totalWorkingMinutes < 240;
        userMap.set(userId, user);
      }
    });

    const records = Array.from(userMap.values()).map(user => ({
      ...user,
      firstCheckInIST: user.firstCheckIn ? istUtils.formatISTTimestamp(user.firstCheckIn) : null,
      lastCheckOutIST: user.lastCheckOut ? istUtils.formatISTTimestamp(user.lastCheckOut) : null,
      totalWorkingHours: istUtils.formatDuration(user.totalWorkingMinutes),
      date: selectedDate.toISOString().split('T')[0],
    }));

    const summary = {
      totalEmployees: allUsers.length,
      present: records.filter(r => r.status !== "absent").length,
      absent: records.filter(r => r.status === "absent").length,
      lateEntries: records.filter(r => r.isLate).length,
      halfDays: records.filter(r => r.isHalfDay || r.status === "half-day").length,
      earlyDepartures: records.filter(r => r.isEarlyDeparture).length,
      fullDays: records.filter(r => r.status === "full-day" || (r.totalWorkingMinutes >= 420)).length,
    };

    res.json({
      success: true,
      selectedDate: selectedDate.toISOString().split('T')[0],
      selectedDateIST: istUtils.formatISTTimestamp(selectedDate),
      summary,
      records,
      count: records.length,
    });
  } catch (error) {
    console.error("Error getting records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch records",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get organization QR codes
const getOrganizationQRCodes = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
        error: "MISSING_ORGANIZATION",
      });
    }

    const org = await Organization.findById(orgId)
      .populate({ path: "checkInQRCodeId", options: { lean: true } })
      .populate({ path: "checkOutQRCodeId", options: { lean: true } })
      .lean();

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
        error: "ORG_NOT_FOUND",
      });
    }

    const currentTime = istUtils.getISTDate();
    const response = {
      organizationName: org.name,
      organizationId: org._id,
      location: org.location,
      qrCodes: {
        checkIn: org.checkInQRCodeId ? {
          id: org.checkInQRCodeId._id,
          code: org.checkInQRCodeId.code,
          type: org.checkInQRCodeId.qrType,
          qrImage: org.checkInQRCodeId.qrImageData,
          active: org.checkInQRCodeId.active,
          usageCount: org.checkInQRCodeId.usageCount,
          createdAt: org.checkInQRCodeId.createdAt,
          createdAtIST: istUtils.formatISTTimestamp(org.checkInQRCodeId.createdAt),
        } : null,
        checkOut: org.checkOutQRCodeId ? {
          id: org.checkOutQRCodeId._id,
          code: org.checkOutQRCodeId.code,
          type: org.checkOutQRCodeId.qrType,
          qrImage: org.checkOutQRCodeId.qrImageData,
          active: org.checkOutQRCodeId.active,
          usageCount: org.checkOutQRCodeId.usageCount,
          createdAt: org.checkOutQRCodeId.createdAt,
          createdAtIST: istUtils.formatISTTimestamp(org.checkOutQRCodeId.createdAt),
        } : null,
      },
      settings: {
        qrCodeValidityMinutes: org.settings?.qrCodeValidityMinutes || 30,
        locationToleranceMeters: org.settings?.locationToleranceMeters || 100,
        requireDeviceRegistration: org.settings?.requireDeviceRegistration || true,
        strictLocationVerification: org.settings?.strictLocationVerification || true,
      },
      lastUpdated: istUtils.formatISTTimestamp(currentTime),
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching organization's QR codes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch QR codes",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// Get QR code by type
const getQRCodeByType = async (req, res) => {
  try {
    const { type } = req.params;
    const orgId = req.user.organizationId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    if (!["check-in", "check-out"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR type. Must be 'check-in' or 'check-out'",
      });
    }

    const org = await Organization.findById(orgId)
      .populate({
        path: type === "check-in" ? "checkInQRCodeId" : "checkOutQRCodeId",
        options: { lean: true },
      })
      .lean();

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const qrCode = type === "check-in" ? org.checkInQRCodeId : org.checkOutQRCodeId;

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: `${type} QR code not found for organization`,
      });
    }

    res.json({
      success: true,
      data: {
        id: qrCode._id,
        code: qrCode.code,
        type: qrCode.qrType,
        qrImage: qrCode.qrImageData,
        active: qrCode.active,
        usageCount: qrCode.usageCount,
        organizationName: org.name,
        organizationLocation: org.location,
        createdAt: qrCode.createdAt,
        createdAtIST: qrCode.createdAtIST,
      },
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} QR code:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch QR code",
    });
  }
};

// Get enhanced today's attendance with comprehensive data
const getTodaysAttendance = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    const startOfDay = DateTimeUtils.getStartOfDayIST();
    const endOfDay = DateTimeUtils.getEndOfDayIST();

    // Get all attendance records for today
    const attendanceRecords = await Attendance.find({
      organizationId: orgId,
      istTimestamp: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("userId", "name email department")
      .sort({ istTimestamp: -1 })
      .lean();

    // Get daily timesheets for today
    const dailyTimesheets = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("userId", "name email department")
      .lean();

    // Get latest check-ins and check-outs (last 10 of each)
    const latestCheckIns = attendanceRecords
      .filter(record => record.type === "check-in")
      .slice(0, 10)
      .map(record => ({
        userId: record.userId._id,
        userName: record.userId.name,
        userEmail: record.userId.email,
        department: record.userId.department,
        time: record.istTimestamp,
        timeIST: DateTimeUtils.formatIST(record.istTimestamp),
        location: record.location,
        verified: record.verified,
      }));

    const latestCheckOuts = attendanceRecords
      .filter(record => record.type === "check-out")
      .slice(0, 10)
      .map(record => ({
        userId: record.userId._id,
        userName: record.userId.name,
        userEmail: record.userId.email,
        department: record.userId.department,
        time: record.istTimestamp,
        timeIST: DateTimeUtils.formatIST(record.istTimestamp),
        location: record.location,
        verified: record.verified,
      }));

    // Calculate today's summary
    const allUsers = await User.find({ organizationId: orgId, role: "user" }).lean();
    const presentUserIds = new Set(dailyTimesheets
      .filter(sheet => sheet.status !== "absent")
      .map(sheet => sheet.userId._id.toString()));

    const summary = {
      totalEmployees: allUsers.length,
      present: presentUserIds.size,
      absent: allUsers.length - presentUserIds.size,
      totalCheckIns: attendanceRecords.filter(r => r.type === "check-in").length,
      totalCheckOuts: attendanceRecords.filter(r => r.type === "check-out").length,
    };

    res.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      dateIST: DateTimeUtils.formatIST(startOfDay),
      summary,
      latestCheckIns,
      latestCheckOuts,
      totalRecords: attendanceRecords.length,
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's attendance",
    });
  }
};

// Update user by admin
const updateUserByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      name, email, department, role, phone, institute,
      workingHours, password, customHolidays, weeklySchedule
    } = req.body;

    if (req.user.role !== "organization") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update user profiles",
      });
    }

    let adminOrgId;
    if (req.user.organizationId) {
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        adminOrgId = req.user.organizationId._id;
      } else {
        adminOrgId = req.user.organizationId;
      }
    } else {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({
          success: false,
          message: "Admin has no organization",
        });
      }
      adminOrgId = org._id;
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(userToUpdate.organizationId) !== String(adminOrgId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: user is not in your organization",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (institute !== undefined) updateData.institute = institute;
    if (workingHours !== undefined) updateData.workingHours = workingHours;
    if (customHolidays !== undefined) updateData.customHolidays = customHolidays;
    if (weeklySchedule !== undefined) updateData.weeklySchedule = weeklySchedule;

    if (password) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser.toObject(),
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.role !== "organization") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete users",
      });
    }

    let adminOrgId;
    if (req.user.organizationId) {
      if (typeof req.user.organizationId === 'object' && req.user.organizationId._id) {
        adminOrgId = req.user.organizationId._id;
      } else {
        adminOrgId = req.user.organizationId;
      }
    } else {
      const org = await Organization.findOne({ adminId: req.user._id }).select("_id");
      if (!org) {
        return res.status(403).json({
          success: false,
          message: "Admin has no organization",
        });
      }
      adminOrgId = org._id;
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (String(user.organizationId) !== String(adminOrgId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden to delete user outside your organization",
      });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await Attendance.deleteMany({ userId: userId });
    await DailyTimeSheet.deleteMany({ userId: userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get single user with enhanced data
const singleUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .select("-password")
      .populate("organizationId", "name")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTimesheets = await DailyTimeSheet.find({
      userId: userId,
      date: { $gte: thirtyDaysAgo },
    }).sort({ date: -1 }).lean();

    const attendanceSummary = {
      totalDays: recentTimesheets.length,
      presentDays: recentTimesheets.filter(sheet => sheet.status !== "absent").length,
      absentDays: recentTimesheets.filter(sheet => sheet.status === "absent").length,
      halfDays: recentTimesheets.filter(sheet => sheet.status === "half-day").length,
      totalWorkingHours: recentTimesheets.reduce((sum, sheet) => sum + (sheet.totalWorkingTime || 0), 0),
    };

    res.json({
      success: true,
      data: {
        ...user,
        attendanceSummary,
        recentAttendance: recentTimesheets.slice(0, 10).map(sheet => ({
          date: sheet.date,
          dateIST: istUtils.formatISTTimestamp(sheet.date),
          status: sheet.status,
          workingMinutes: sheet.totalWorkingTime,
          workingHours: istUtils.formatDuration(sheet.totalWorkingTime),
          sessions: sheet.sessions.length,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching single user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

// Get comprehensive dashboard data
const getDashboardData = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    const today = istUtils.getStartOfDayIST();
    const endToday = istUtils.getEndOfDayIST();

    const [allUsers, todayTimesheets, todayAttendance] = await Promise.all([
      User.find({ organizationId: orgId, role: "user" }).select("name email department").lean(),
      DailyTimeSheet.find({
        organizationId: orgId,
        date: { $gte: today, $lte: endToday },
      }).populate("userId", "name email department").lean(),
      Attendance.find({
        organizationId: orgId,
        istTimestamp: { $gte: today, $lte: endToday },
      }).populate("userId", "name email").sort({ istTimestamp: -1 }).lean()
    ]);

    const stats = {
      totalEmployees: allUsers.length,
      present: todayTimesheets.filter(sheet => sheet.status !== "absent").length,
      absent: allUsers.length - todayTimesheets.filter(sheet => sheet.status !== "absent").length,
      lateEntries: 0,
      halfDays: todayTimesheets.filter(sheet => sheet.status === "half-day").length,
      fullDays: todayTimesheets.filter(sheet => sheet.status === "full-day").length,
      earlyDepartures: 0,
      totalCheckIns: todayAttendance.filter(record => record.type === "check-in").length,
      totalCheckOuts: todayAttendance.filter(record => record.type === "check-out").length,
    };

    for (const sheet of todayTimesheets) {
      if (sheet.sessions && sheet.sessions.length > 0) {
        const firstCheckIn = sheet.sessions[0]?.checkIn?.time;
        if (firstCheckIn) {
          const checkInTime = new Date(firstCheckIn);
          const expectedStart = new Date(checkInTime);
          expectedStart.setHours(9, 0, 0, 0);
          if (checkInTime > expectedStart) {
            stats.lateEntries++;
          }
        }

        const lastCheckOut = [...sheet.sessions]
          .reverse()
          .find(s => s.checkOut?.time)?.checkOut?.time;
        if (lastCheckOut) {
          const checkOutTime = new Date(lastCheckOut);
          const expectedEnd = new Date(checkOutTime);
          expectedEnd.setHours(17, 0, 0, 0);
          if (checkOutTime < expectedEnd && sheet.status !== "absent") {
            stats.earlyDepartures++;
          }
        }
      }
    }

    const latestActivities = todayAttendance.slice(0, 20).map(record => ({
      userId: record.userId._id,
      userName: record.userId.name,
      userEmail: record.userId.email,
      type: record.type,
      time: record.istTimestamp,
      timeIST: istUtils.formatISTTimestamp(record.istTimestamp),
      verified: record.verified,
    }));

    res.json({
      success: true,
      date: today.toISOString().split('T')[0],
      dateIST: istUtils.formatISTTimestamp(today),
      stats,
      latestActivities,
      message: "Dashboard data fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
};

// NEW: Auto mark present on holidays
const markHolidayAttendance = async (req, res) => {
  try {
    const { date } = req.body;
    const orgId = req.user.organizationId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required (YYYY-MM-DD format)",
      });
    }

    const holidayDate = new Date(date);
    const isHoliday = !(await holidayService.isWorkingDay(holidayDate));

    if (!isHoliday) {
      return res.status(400).json({
        success: false,
        message: "The specified date is not a holiday",
      });
    }

    const startOfDay = DateTimeUtils.getStartOfDayIST(holidayDate);
    const endOfDay = DateTimeUtils.getEndOfDayIST(holidayDate);

    // Get all users in organization
    const users = await User.find({ organizationId: orgId, role: "user" }).lean();

    // Create or update daily timesheets for holiday
    const bulkOperations = users.map(user => ({
      updateOne: {
        filter: {
          userId: user._id,
          organizationId: orgId,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        update: {
          $setOnInsert: {
            userId: user._id,
            organizationId: orgId,
            date: startOfDay,
            sessions: [],
            totalWorkingTime: 480, // 8 hours for holiday
            status: "full-day",
            isHoliday: true,
          }
        },
        upsert: true,
      }
    }));

    const result = await DailyTimeSheet.bulkWrite(bulkOperations);

    res.json({
      success: true,
      message: "Holiday attendance marked successfully",
      data: {
        date: date,
        dateIST: DateTimeUtils.formatIST(holidayDate),
        usersMarked: users.length,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error marking holiday attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark holiday attendance",
    });
  }
};

module.exports = {
  records,
  singleUser,
  getOrganizationQRCodes,
  getTodaysAttendance,
  deleteUser,
  getQRCodeByType,
  getusers,
  updateUserByAdmin,
  resetUserDevice,
  getDeviceChangeRequests,
  handleDeviceChangeRequest,
  getDashboardData,
  markHolidayAttendance,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
