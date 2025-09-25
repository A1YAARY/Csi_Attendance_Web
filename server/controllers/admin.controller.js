const User = require("../models/user.models");
const Attendance = require("../models/Attendance.models");
const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

// Reset user device (allow user to register new device)
const resetUserDevice = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check if the requesting user is an admin
    if (req.user.role !== "organization") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reset user devices",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to same organization
    if (String(user.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden to reset device for user outside your organization",
      });
    }

    // Reset device info - allow user to register new device
    user.deviceInfo = {
      isRegistered: false,
      deviceId: null,
      deviceType: null,
      deviceFingerprint: null,
      registeredAt: null,
      lastKnownLocation: null,
    };

    await user.save();

    console.log(
      `✅ Device reset for user ${user.email} by admin ${req.user.email}`
    );

    res.json({
      success: true,
      message:
        "User device reset successfully. User can now register a new device.",
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        resetAt: getISTDate(),
      },
    });
  } catch (error) {
    console.error("Error resetting user device:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset user device",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all users in organization
const getusers = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    console.log("Fetching users for organization:", orgId);

    // Find all users in the organization
    const allusers = await User.find({ organizationId: orgId })
      .select("-password") // Exclude password field for security
      .sort({ createdAt: -1 });

    console.log(`Found ${allusers.length} users for organization ${orgId}`);

    // Return consistent response format
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: allusers,
      count: allusers.length,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get device change requests
const getDeviceChangeRequests = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    // Get all users with pending device change requests
    const usersWithRequests = await User.find({
      organizationId: orgId,
      "deviceChangeRequest.status": "pending",
    }).select("name email deviceInfo deviceChangeRequest");

    const requests = usersWithRequests.map((user) => ({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      currentDevice: user.deviceInfo.deviceId,
      newDeviceId: user.deviceChangeRequest.newDeviceId,
      newDeviceType: user.deviceChangeRequest.newDeviceType,
      requestedAt: user.deviceChangeRequest.requestedAt,
      requestedAtIST: user.deviceChangeRequest.requestedAt
        ? user.deviceChangeRequest.requestedAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
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
    const { userId, action, reason } = req.body; // action: 'approve' or 'reject'

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

    // Check if user belongs to same organization
    if (user.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to handle this request",
      });
    }

    if (
      !user.deviceChangeRequest ||
      user.deviceChangeRequest.status !== "pending"
    ) {
      return res.status(400).json({
        success: false,
        message: "No pending device change request found for this user",
      });
    }

    if (action === "approve") {
      // Update device info with new device
      user.deviceInfo = {
        deviceId: user.deviceChangeRequest.newDeviceId,
        deviceType: user.deviceChangeRequest.newDeviceType,
        deviceFingerprint: user.deviceChangeRequest.newDeviceFingerprint,
        isRegistered: true,
        registeredAt: getISTDate(),
      };
    }

    // Update request status
    user.deviceChangeRequest.status =
      action === "approve" ? "approved" : "rejected";
    user.deviceChangeRequest.adminResponse = {
      adminId: req.user._id,
      respondedAt: getISTDate(),
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

// Enhanced records function with IST
const records = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    const attendanceRecords = await Attendance.find({ organizationId: orgId })
      .populate("userId", "name email role department")
      .sort({ createdAt: -1 });

    // Process the records to format them according to requirements
    const processedRecords = attendanceRecords
      .map((record) => {
        const checkInRecord = record.type === "check-in" ? record : null;
        const checkOutRecord = record.type === "check-out" ? record : null;

        // Find corresponding check-out for this check-in
        if (checkInRecord) {
          const sameDay = attendanceRecords.filter(
            (r) =>
              r.userId._id.toString() === record.userId._id.toString() &&
              new Date(r.createdAt).toDateString() ===
                new Date(record.createdAt).toDateString()
          );

          const checkOut = sameDay.find((r) => r.type === "check-out");

          // Calculate working hours
          let workingHours = "-";
          let status = "Incomplete";
          let checkOutTime = "-";

          if (checkOut) {
            const checkInTime = new Date(record.createdAt);
            const checkOutDateTime = new Date(checkOut.createdAt);
            const diffInMillis = checkOutDateTime - checkInTime;
            const hours = Math.floor(diffInMillis / (1000 * 60 * 60));
            const minutes = Math.floor(
              (diffInMillis % (1000 * 60 * 60)) / (1000 * 60)
            );
            workingHours = `${hours}h ${minutes}m`;
            status = "Complete";

            // Format check-out time in IST
            checkOutTime = checkOutDateTime.toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }

          return {
            name: record.userId.name,
            role: record.userId.role || "Employee",
            department: record.userId.department || "General",
            date: new Date(record.createdAt).toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            status: status,
            checkInTime: new Date(record.createdAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            checkOutTime: checkOutTime,
            workingHours: workingHours,
            location: record.location,
            organizationId: record.organizationId,
            verified: record.verified || false,
          };
        }

        return null;
      })
      .filter(Boolean); // Remove null entries

    // Remove duplicates based on name and date
    const uniqueRecords = processedRecords.reduce((acc, current) => {
      const key = `${current.name}-${current.date}`;
      if (!acc.find((item) => `${item.name}-${item.date}` === key)) {
        acc.push(current);
      }
      return acc;
    }, []);

    res.json({
      success: true,
      attendanceRecords: uniqueRecords,
    });
  } catch (error) {
    console.error("Error getting records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch records",
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

    // Get organization with populated QR codes
    const org = await Organization.findById(orgId)
      .populate("checkInQRCodeId")
      .populate("checkOutQRCodeId");

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
        error: "ORG_NOT_FOUND",
      });
    }

    // Format response with complete QR code data
    const response = {
      organizationName: org.name,
      organizationId: org._id,
      location: org.location,
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
        locationToleranceMeters: org.settings?.locationToleranceMeters || 100,
        requireDeviceRegistration:
          org.settings?.requireDeviceRegistration || true,
        strictLocationVerification:
          org.settings?.strictLocationVerification || true,
      },
      lastUpdated: new Date().toISOString(),
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
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Get QR code by type
const getQRCodeByType = async (req, res) => {
  try {
    const { type } = req.params; // 'check-in' or 'check-out'
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

    const org = await Organization.findById(orgId).populate(
      type === "check-in" ? "checkInQRCodeId" : "checkOutQRCodeId"
    );

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const qrCode =
      type === "check-in" ? org.checkInQRCodeId : org.checkOutQRCodeId;

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

// Get today's attendance with IST
const getTodaysAttendance = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
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
      obj.timeISTFormatted = obj.timeIST.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return obj;
    });

    res.json({
      success: true,
      records: formatted,
      count: formatted.length,
      date: startOfDayIST.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
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
      name,
      email,
      department,
      role,
      phone,
      institute,
      workingHours,
      password,
    } = req.body;

    // Check if the requesting user is an admin
    if (req.user.role !== "organization") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update user profiles",
      });
    }

    // Find the user to update
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to same organization
    if (
      String(userToUpdate.organizationId) !== String(req.user.organizationId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden to update user outside your organization",
      });
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (department) updateData.department = department;
    if (role) updateData.role = role;
    if (phone) updateData.phone = phone;
    if (institute) updateData.institute = institute;
    if (workingHours) updateData.workingHours = workingHours;

    if (password) {
      // Hash password if provided
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }

    console.log("Updating user:", userId, "with data:", updateData);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password"); // Exclude password from response

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("User updated successfully:", updatedUser);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
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

    // Check if the requesting user is an admin
    if (req.user.role !== "organization") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete users",
      });
    }

    // Find the user to delete
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to same organization
    if (String(user.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden to delete user outside your organization",
      });
    }

    // Prevent admin from deleting themselves
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    console.log("Deleting user:", userId, "by admin:", req.user._id);

    // Delete the user
    await User.findByIdAndDelete(userId);

    console.log("User deleted successfully:", userId);

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

// Get single user
const singleUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .select("-password")
      .populate("organizationId", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching single user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
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
};
