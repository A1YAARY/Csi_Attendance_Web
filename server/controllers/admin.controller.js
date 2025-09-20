const User = require("../models/user.models");
const Attendance = require("../models/Attendance.models");
const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");

// Define the missing records function to avoid route errors

const getusers = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ message: "User not associated with any organization" });
    }
    const allusers = await User.find({ organizationId: orgId }).sort({
      createdAt: -1,
    });
    res.json({ allusers });
  } catch (error) {
    console.error("Error getting records:", error);
    res.status(500).json({ message: "Failed to fetch all users" });
  }
};
const records = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ message: "User not associated with any organization" });
    }
    const attendanceRecords = await Attendance.find({ organizationId: orgId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json({ attendanceRecords });
  } catch (error) {
    console.error("Error getting records:", error);
    res.status(500).json({ message: "Failed to fetch records" });
  }
};

const getOrganizationQRCodes = async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    if (!orgId) {
      return res.status(400).json({
        message: "User not associated with any organization",
        error: "MISSING_ORGANIZATION",
      });
    }

    // Get organization with populated QR codes
    const org = await Organization.findById(orgId)
      .populate("checkInQRCodeId")
      .populate("checkOutQRCodeId");

    if (!org) {
      return res.status(404).json({
        message: "Organization not found",
        error: "ORG_NOT_FOUND",
      });
    }

    // Format response with complete QR code data
    const response = {
      organizationName: org.name,
      organizationId: org._id,
      qrCodes: {
        checkIn: org.checkInQRCodeId
          ? {
              id: org.checkInQRCodeId._id,
              code: org.checkInQRCodeId.code,
              type: org.checkInQRCodeId.qrType,
              qrImage: org.checkInQRCodeId.qrImageData,
              active: org.checkInQRCodeId.active,
              usageCount: org.checkInQRCodeId.usageCount,
              createdAt: org.checkInQRCodeId.createdAt,
              createdAtIST: org.checkInQRCodeId.createdAtIST,
            }
          : null,
        checkOut: org.checkOutQRCodeId
          ? {
              id: org.checkOutQRCodeId._id,
              code: org.checkOutQRCodeId.code,
              type: org.checkOutQRCodeId.qrType,
              qrImage: org.checkOutQRCodeId.qrImageData,
              active: org.checkOutQRCodeId.active,
              usageCount: org.checkOutQRCodeId.usageCount,
              createdAt: org.checkOutQRCodeId.createdAt,
              createdAtIST: org.checkOutQRCodeId.createdAtIST,
            }
          : null,
      },
      settings: {
        qrCodeValidityMinutes: org.settings?.qrCodeValidityMinutes || 30,
        locationToleranceMeters: org.settings?.locationToleranceMeters || 50,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching organization's QR codes:", error);
    res.status(500).json({
      message: "Failed to fetch QR codes",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// New function to get QR code by type (check-in or check-out)
const getQRCodeByType = async (req, res) => {
  try {
    const { type } = req.params; // 'check-in' or 'check-out'
    const orgId = req.user.organizationId;

    if (!orgId) {
      return res.status(400).json({
        message: "User not associated with any organization",
      });
    }

    if (!["check-in", "check-out"].includes(type)) {
      return res.status(400).json({
        message: "Invalid QR type. Must be 'check-in' or 'check-out'",
      });
    }

    const org = await Organization.findById(orgId).populate(
      type === "check-in" ? "checkInQRCodeId" : "checkOutQRCodeId"
    );

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const qrCode =
      type === "check-in" ? org.checkInQRCodeId : org.checkOutQRCodeId;

    if (!qrCode) {
      return res.status(404).json({
        message: `${type} QR code not found for organization`,
      });
    }

    res.json({
      id: qrCode._id,
      code: qrCode.code,
      type: qrCode.qrType,
      qrImage: qrCode.qrImageData,
      active: qrCode.active,
      usageCount: qrCode.usageCount,
      organizationName: org.name,
      createdAt: qrCode.createdAt,
      createdAtIST: qrCode.createdAtIST,
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} QR code:`, error);
    res.status(500).json({ message: "Failed to fetch QR code" });
  }
};

const getTodaysAttendance = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ message: "User not associated with any organization" });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hrs
    const istNow = new Date(now.getTime() + istOffset);

    const startOfDayIST = new Date(
      Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const endOfDayIST = new Date(
      Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    // Fetch records
    const records = await Attendance.find({
      organizationId: orgId,
      createdAt: { $gte: startOfDayIST, $lte: endOfDayIST },
    }).populate("userId", "name email");

    // Add IST time to response
    const formatted = records.map((record) => {
      const obj = record.toObject();
      obj.timeIST = new Date(record.createdAt.getTime() + istOffset);
      return obj;
    });
    res.json({ records: formatted });

    // const startOfDay = new Date();
    // startOfDay.setHours(0, 0, 0, 0);
    // const endOfDay = new Date();
    // endOfDay.setHours(23, 59, 59, 999);
    // const records = await Attendance.find({
    //   organizationId: orgId,
    //   // timestamp: { $gte: startOfDay, $lte: endOfDay },
    // }).populate("userId", "name email");
    // res.json({ records });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    res.status(500).json({ message: "Failed to fetch today's attendance" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (String(user.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({
        message: "Forbidden to delete user outside your organization",
      });
    }
    await User.findByIdAndDelete(userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

const singleUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .select("-password")
      .populate("organizationId", "name");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching single user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
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
};
