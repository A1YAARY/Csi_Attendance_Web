const User = require("../models/user.models");

const Attendance = require("../models/Attendance.models");

const QRCode = require("../models/Qrcode.models");

const Organization = require("../models/organization.models");
const { handleAsync, ApiError } = require("../utils/errorHandler");

// IST helper function

const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

// Reset user device (allow user to register new device)

const resetUserDevice = handleAsync(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (req.user.role !== "organization") {
    // If not an org admin, allow self-reset only
    if (String(req.user._id) !== String(userId)) {
      throw new ApiError(403, "Only admins can reset user devices");
    }
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // Determine admin's organization for scoping
  let adminOrgId = req.user.organizationId;
  if (req.user.role === "organization" && !adminOrgId) {
    const org = await Organization.findOne({ adminId: req.user._id }).select(
      "_id"
    );
    if (!org) {
      throw new ApiError(403, "Admin has no organization");
    }

    adminOrgId = org._id;
  }

  // Reset device info
  targetUser.deviceInfo = {
    isRegistered: false,
    deviceId: null,
    deviceType: null,
    deviceFingerprint: null,
    registeredAt: null,
    lastKnownLocation: null,
  };
  await targetUser.save();

  return res.json({
    success: true,
    message:
      "User device reset successfully. User can now register a new device.",
    data: {
      userId: targetUser._id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      deviceInfo: targetUser.deviceInfo,
      resetAt: getISTDate(),
      resetAtFormatted: getISTDate().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  });
});

const getusers = handleAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  // Resolve organizationId robustly for admins or scoped users
  let orgId = req.user.organizationId;
  if (req.user.role === "organization" && !orgId) {
    const org = await Organization.findOne({ adminId: req.user._id })
      .select("_id")
      .lean();
    if (!org) {
      throw new ApiError(403, "Admin has no organization");
    }

    orgId = org._id;
  }

  if (!orgId) {
    throw new ApiError(400, "No organization scope");
  }

  // Use lean() to avoid cache/clone issues and format for frontend
  const users = await User.find({ organizationId: orgId })
    .select("-password -refreshToken")
    .lean()
    .sort({ createdAt: -1 })
    .hint({ organizationId: 1, createdAt: -1 });
  const formatted = users.map((u) => ({
    _id: u._id,
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role || "user",
    department: u.department || "cmpn",
    phone: u.phone || "",
    institute: u.institute || "",
    workingHours: u.workingHours || { start: "09:00", end: "17:00" },
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
    createdAtFormatted: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A",
  }));

  return res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: formatted,
    count: formatted.length,
  });
});

// Get device change requests

const getDeviceChangeRequests = handleAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    throw new ApiError(400, "User not associated with any organization");
  }

  // Get all users with pending device change requests
  const usersWithRequests = await User.find({
    organizationId: orgId,
    "deviceChangeRequest.status": "pending",
  })
    .select("name email deviceInfo deviceChangeRequest")
    .lean();
  const requests = usersWithRequests.map((user) => ({
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    currentDevice: user.deviceInfo?.deviceId,
    newDeviceId: user.deviceChangeRequest?.newDeviceId,
    newDeviceType: user.deviceChangeRequest?.newDeviceType,
    requestedAt: user.deviceChangeRequest?.requestedAt,
    requestedAtIST: user.deviceChangeRequest?.requestedAt
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
});

// Handle device change request (approve/reject)

const handleDeviceChangeRequest = handleAsync(async (req, res) => {
  const { userId, action, reason } = req.body;
  if (!userId || !action || !["approve", "reject"].includes(action)) {
    throw new ApiError(
      400,
      "User ID and valid action (approve/reject) are required"
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user belongs to same organization
  if (user.organizationId.toString() !== req.user.organizationId.toString()) {
    throw new ApiError(403, "Unauthorized to handle this request");
  }

  if (
    !user.deviceChangeRequest ||
    user.deviceChangeRequest.status !== "pending"
  ) {
    throw new ApiError(
      400,
      "No pending device change request found for this user"
    );
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
});

// Enhanced records function with IST

const records = handleAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    throw new ApiError(400, "User not associated with any organization");
  }

  const attendanceRecords = await Attendance.find({ organizationId: orgId })
    .populate("userId", "name email role department")
    .sort({ createdAt: -1 })
    .lean();

  // Process the records to format them according to requirements
  const processedRecords = attendanceRecords
    .map((record) => {
      const checkInRecord = record.type === "check-in" ? record : null;
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
    .filter(Boolean);

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
});

// Get organization QR codes

const getOrganizationQRCodes = handleAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    throw new ApiError(400, "User not associated with any organization", {
      error: "MISSING_ORGANIZATION",
    });
  }

  // Get organization with populated QR codes using lean
  const org = await Organization.findById(orgId)
    .populate({ path: "checkInQRCodeId", options: { lean: true } })
    .populate({ path: "checkOutQRCodeId", options: { lean: true } })
    .lean();
  if (!org) {
    throw new ApiError(404, "Organization not found", {
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
});

// Get QR code by type

const getQRCodeByType = handleAsync(async (req, res) => {
  const { type } = req.params;
  const orgId = req.user.organizationId;
  if (!orgId) {
    throw new ApiError(400, "User not associated with any organization");
  }

  if (!["check-in", "check-out"].includes(type)) {
    throw new ApiError(
      400,
      "Invalid QR type. Must be 'check-in' or 'check-out'"
    );
  }

  const org = await Organization.findById(orgId)
    .populate({
      path: type === "check-in" ? "checkInQRCodeId" : "checkOutQRCodeId",
      options: { lean: true },
    })
    .lean();
  if (!org) {
    throw new ApiError(404, "Organization not found");
  }

  const qrCode =
    type === "check-in" ? org.checkInQRCodeId : org.checkOutQRCodeId;
  if (!qrCode) {
    throw new ApiError(404, `${type} QR code not found for organization`);
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
});

// Get today's attendance with IST

const getTodaysAttendance = handleAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    throw new ApiError(400, "User not associated with any organization");
  }

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
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

  // Fetch records with lean
  const records = await Attendance.find({
    organizationId: orgId,
    createdAt: { $gte: startOfDayIST, $lte: endOfDayIST },
  })
    .populate("userId", "name email")
    .lean();

  // Add IST time to response
  const formatted = records.map((record) => {
    const obj = { ...record };
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
});

// Update user by admin

const updateUserByAdmin = handleAsync(async (req, res) => {
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
    throw new ApiError(403, "Only admins can update user profiles");
  }

  // Find the user to update
  const userToUpdate = await User.findById(userId);
  if (!userToUpdate) {
    throw new ApiError(404, "User not found");
  }

  // Check if user belongs to same organization
  if (String(userToUpdate.organizationId) !== String(req.user.organizationId)) {
    throw new ApiError(
      403,
      "Forbidden to update user outside your organization"
    );
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
  }).select("-password");
  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  console.log("User updated successfully:", updatedUser);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updatedUser.toObject(), // Convert to plain object
  });
});

// Delete user

const deleteUser = handleAsync(async (req, res) => {
  const userId = req.params.id;
  // Check if the requesting user is an admin
  if (req.user.role !== "organization") {
    throw new ApiError(403, "Only admins can delete users");
  }

  // Find the user to delete
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user belongs to same organization
  if (String(user.organizationId) !== String(req.user.organizationId)) {
    throw new ApiError(
      403,
      "Forbidden to delete user outside your organization"
    );
  }

  // Prevent admin from deleting themselves
  if (String(user._id) === String(req.user._id)) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  console.log("Deleting user:", userId, "by admin:", req.user._id);

  // Delete the user
  await User.findByIdAndDelete(userId);
  console.log("User deleted successfully:", userId);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// Get single user

const singleUser = handleAsync(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId)
    .select("-password")
    .populate("organizationId", "name")
    .lean(); // Use lean to return plain object
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json({
    success: true,
    data: user,
  });
});

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
