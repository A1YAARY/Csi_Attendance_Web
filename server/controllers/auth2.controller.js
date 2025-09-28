const express = require("express");
const User = require("../models/user.models");
const Organization = require("../models/organization.models");
const jwt = require("jsonwebtoken");
const qrGenerator = require("../utils/qrGenerator");
const QRCode = require("../models/Qrcode.models");
const { sendMail } = require("../utils/mailer");
const geocodingService = require("../utils/geocoding"); // NEW: Multi-provider geocoding
const istUtils = require("../utils/istDateTimeUtils"); // Use unified IST utils

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

// Token generation function
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "180d",
  });
  return { accessToken, refreshToken };
};

// Token verification endpoint
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
        code: "NO_TOKEN_PROVIDED",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      let errorCode = "INVALID_TOKEN";
      let errorMessage = "Token is invalid";
      if (error.name === "TokenExpiredError") {
        errorCode = "TOKEN_EXPIRED";
        errorMessage = "Token has expired";
      } else if (error.name === "JsonWebTokenError") {
        errorCode = "MALFORMED_TOKEN";
        errorMessage = "Token is malformed";
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
        code: errorCode,
        expiredAt: error.expiredAt,
      });
    }

    // Verify user still exists
    const user = await User.findById(decoded.userId)
      .populate("organizationId")
      .select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Token is valid",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: user.organizationId
        ? {
          id: user.organizationId._id,
          name: user.organizationId.name,
        }
        : null,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during token verification",
      code: "SERVER_ERROR",
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not provided",
        code: "NO_REFRESH_TOKEN",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const user = await User.findById(decoded.userId).populate("organizationId");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: user.organizationId
        ? { id: user.organizationId._id, name: user.organizationId.name }
        : null,
      accessToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during token refresh",
      code: "SERVER_ERROR",
    });
  }
};


const register_orginization = async (req, res) => {
  try {
    const { email, password, name, organizationName, address } = req.body;

    if (!email || !password || !name || !organizationName || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields including address are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    console.log(`🌍 Starting geocoding for address: "${address}"`);
    const geoResult = await geocodingService.geocodeAddress(address);
    console.log("📍 Geocoding result:", {
      provider: geoResult.provider,
      coordinates: `${geoResult.latitude}, ${geoResult.longitude}`,
      accuracy: geoResult.accuracy,
      confidence: geoResult.confidence,
    });

    const user = new User({
      email,
      password,
      name,
      role: "organization",
    });

    await user.save();

    const addressComponents = address.split(",").map((part) => part.trim());
    const organization = new Organization({
      name: organizationName,
      address: {
        fullAddress: address,
        street: addressComponents[0] || "",
        city: addressComponents[1] || "",
        state: addressComponents[2] || "Maharashtra",
        country: "India",
      },
      location: {
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
        radius: 500,
        address: geoResult.formatted_address,
        isVerified: true,
        lastUpdated: istUtils.getISTDate(),
        geocoding: {
          provider: geoResult.provider,
          accuracy: geoResult.accuracy,
          confidence: geoResult.confidence,
          geocodedAt: istUtils.getISTDate(),
        },
      },
      adminId: user._id,
    });

    await organization.save();

    user.organizationId = organization._id;
    await user.save();

    const checkInQR = await qrGenerator.generateQRCode(
      organization._id,
      organization.location,
      30,
      "check-in"
    );

    const checkInQRDoc = await QRCode.create({
      organizationId: organization._id,
      code: checkInQR.code,
      qrType: "check-in",
      location: {
        latitude: organization.location.latitude,
        longitude: organization.location.longitude,
        radius: organization.location.radius,
      },
      qrImageData: checkInQR.qrCodeImage,
      active: true,
    });

    const checkOutQR = await qrGenerator.generateQRCode(
      organization._id,
      organization.location,
      30,
      "check-out"
    );

    const checkOutQRDoc = await QRCode.create({
      organizationId: organization._id,
      code: checkOutQR.code,
      qrType: "check-out",
      location: {
        latitude: organization.location.latitude,
        longitude: organization.location.longitude,
        radius: organization.location.radius,
      },
      qrImageData: checkOutQR.qrCodeImage,
      active: true,
    });

    organization.checkInQRCodeId = checkInQRDoc._id;
    organization.checkOutQRCodeId = checkOutQRDoc._id;
    await organization.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "Organization registered successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        address: organization.address,
        location: {
          latitude: organization.location.latitude,
          longitude: organization.location.longitude,
          address: organization.location.address,
          radius: organization.location.radius,
          geocoding: {
            provider: geoResult.provider,
            accuracy: geoResult.accuracy,
            confidence: geoResult.confidence,
          },
        },
        checkInQRCode: checkInQRDoc.code,
        checkOutQRCode: checkOutQRDoc.code,
      },
      accessToken,
    });
  } catch (err) {
    console.error("Organization registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const register_user = async (req, res) => {
  try {
    const { email, name, organizationCode, institute, department, password } = req.body;

    if (!email || !organizationCode || !name || !institute || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const organization = await Organization.findOne({ name: organizationCode });
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization code"
      });
    }

    const user = new User({
      email,
      password: password,
      name,
      role: "user",
      institute,
      department,
      organizationId: organization._id,
      deviceInfo: { isRegistered: false },
    });

    await user.save();

    try {
      const resetToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&newUser=true`;
      const emailSubject = "Welcome to Attendance System - Set Your Password";
      const emailBody = `
 Hello ${name},
 
 Your account has been created successfully for ${organization.name}.
 
 Please set your password using the link below:
 ${resetLink}
 
 This link will expire in 24 hours for security reasons.
 
 Account Details:
 - Email: ${email}
 - Organization: ${organization.name}
 - Institute: ${institute}
 - Department: ${department}
 
 If you didn't request this account creation, please contact your administrator.
 
 Best regards,
 Attendance System Team
             `;

      await sendMail(email, emailSubject, emailBody);
    } catch (mailErr) {
      console.error("Password setup email error:", mailErr);
      // Continue without failing registration
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      accessToken,
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during user registration"
    });
  }
};

// Enhanced login with device registration check
const login = async (req, res) => {
  try {
    const { email, password, deviceId, deviceType, deviceFingerprint } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).populate("organizationId");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Handle device registration for users (not admins)
    if (user.role === "user") {
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required for users",
          requiresDeviceInfo: true,
        });
      }

      // Check if device is already registered
      if (!user.deviceInfo.isRegistered) {
        // First time login - register device
        user.deviceInfo = {
          deviceId: deviceId,
          deviceType: deviceType || "unknown",
          deviceFingerprint: deviceFingerprint || "",
          isRegistered: true,
          registeredAt: istUtils.getISTDate(),
          lastKnownLocation: null,
        };
        console.log(`✅ Device registered for user ${user.email}: ${deviceId}`);
      } else {
        // Check if same device - ENHANCED VALIDATION
        if (user.deviceInfo.deviceId !== deviceId) {
          return res.status(403).json({
            success: false,
            message: "Device not authorized. Please request device change from admin.",
            code: "DEVICE_NOT_AUTHORIZED",
            registeredDevice: user.deviceInfo.deviceId,
            currentDevice: deviceId,
            requiresAdminReset: true,
          });
        }
      }
    }

    // Update last login
    user.lastLogin = istUtils.getISTDate();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        deviceRegistered: user.deviceInfo?.isRegistered || false,
      },
      organization: user.organizationId
        ? {
          id: user.organizationId._id,
          name: user.organizationId.name,
          location: user.organizationId.location,
        }
        : null,
      accessToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};
const requestDeviceChange = async (req, res) => {
  try {
    const { newDeviceId, newDeviceType, newDeviceFingerprint, reason } = req.body;

    if (!newDeviceId) {
      return res.status(400).json({
        success: false,
        message: "New device ID is required"
      });
    }

    const user = await User.findById(req.user._id).populate('organizationId');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if already has pending request
    if (user.deviceChangeRequest && user.deviceChangeRequest.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "You already have a pending device change request",
        existingRequest: {
          newDeviceId: user.deviceChangeRequest.newDeviceId,
          requestedAt: user.deviceChangeRequest.requestedAt,
          requestedAtIST: istUtils.formatISTTimestamp(user.deviceChangeRequest.requestedAt),
          status: user.deviceChangeRequest.status
        }
      });
    }

    // Create device change request
    user.deviceChangeRequest = {
      newDeviceId,
      newDeviceType: newDeviceType || "unknown",
      newDeviceFingerprint: newDeviceFingerprint || "",
      requestedAt: istUtils.getISTDate(),
      status: "pending"
    };

    await user.save();

    // Create notification for admin
    await Notification.create({
      type: "devicechangerequest",
      organizationId: user.organizationId._id,
      userId: user._id,
      title: "New Device Change Request",
      message: `${user.name} (${user.email}) has requested to change device from ${user.deviceInfo?.deviceId || 'Unregistered Device'} to ${newDeviceId}`,
      data: {
        currentDevice: user.deviceInfo?.deviceId || null,
        currentDeviceType: user.deviceInfo?.deviceType || null,
        newDevice: newDeviceId,
        newDeviceType: newDeviceType,
        userEmail: user.email,
        userName: user.name,
        reason: reason || "",
        requestId: user.deviceChangeRequest._id
      },
      priority: "high"
    });

    console.log(`Device change request created for user: ${user.email}, New device: ${newDeviceId}`);

    res.json({
      success: true,
      message: "Device change request submitted successfully. Admin will review your request.",
      request: {
        newDeviceId,
        newDeviceType: newDeviceType || "unknown",
        requestedAt: user.deviceChangeRequest.requestedAt,
        requestedAtIST: istUtils.formatISTTimestamp(user.deviceChangeRequest.requestedAt),
        status: "pending"
      }
    });
  } catch (error) {
    console.error("Device change request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit device change request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const { limit = 20, onlyUnread = false } = req.query;
    const userId = req.user._id;

    const query = { userId: userId };
    if (onlyUnread === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
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
      readAtIST: notification.readAt ? istUtils.formatISTTimestamp(notification.readAt) : null
    }));

    const unreadCount = await Notification.countDocuments({ userId: userId, isRead: false });

    res.json({
      success: true,
      data: formattedNotifications,
      count: formattedNotifications.length,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
};
// Get user's device change request status
const getUserDeviceRequestStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('deviceInfo deviceChangeRequest').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const response = {
      currentDevice: {
        deviceId: user.deviceInfo?.deviceId || null,
        deviceType: user.deviceInfo?.deviceType || null,
        isRegistered: user.deviceInfo?.isRegistered || false,
        registeredAt: user.deviceInfo?.registeredAt || null,
        registeredAtIST: user.deviceInfo?.registeredAt ? istUtils.formatISTTimestamp(user.deviceInfo.registeredAt) : null
      },
      pendingRequest: null
    };

    if (user.deviceChangeRequest) {
      response.pendingRequest = {
        newDeviceId: user.deviceChangeRequest.newDeviceId,
        newDeviceType: user.deviceChangeRequest.newDeviceType,
        requestedAt: user.deviceChangeRequest.requestedAt,
        requestedAtIST: istUtils.formatISTTimestamp(user.deviceChangeRequest.requestedAt),
        status: user.deviceChangeRequest.status
      };

      // If approved or rejected, include admin response
      if (user.deviceChangeRequest.adminResponse) {
        response.pendingRequest.adminResponse = {
          respondedAt: user.deviceChangeRequest.adminResponse.respondedAt,
          respondedAtIST: istUtils.formatISTTimestamp(user.deviceChangeRequest.adminResponse.respondedAt),
          reason: user.deviceChangeRequest.adminResponse.reason
        };
      }
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("Get device request status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get device request status"
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, workingHours, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (workingHours) updateData.workingHours = workingHours;
    if (password) updateData.password = password;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const response = {
      ...user.toObject(),
      organization: user.organizationId || null,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile",
    });
  }
};

const viewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("organizationId", "name location")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const response = {
      ...user.toObject(),
      organization: user.organizationId || null,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("View profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};

const logout = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

module.exports = {
  register_orginization,
  register_user,
  login,
  logout,
  getUserDeviceRequestStatus,
  updateProfile,
  viewProfile,
  refreshToken,
  verifyToken,
  requestDeviceChange,
  getUserNotifications,

};
