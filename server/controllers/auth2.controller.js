const express = require("express");
const User = require("../models/user.models");
const Organization = require("../models/organization.models");
const jwt = require("jsonwebtoken");
const qrGenerator = require("../utils/qrGenerator");
const QRCode = require("../models/Qrcode.models");
const { sendMail } = require("../utils/mailer");
const geocodingService = require("../utils/geocoding"); // NEW: Multi-provider geocoding

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

// Token refresh endpoint
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

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id
    );

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
        ? {
            id: user.organizationId._id,
            name: user.organizationId.name,
          }
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

// FIXED: Enhanced organization registration with multi-provider geocoding
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
        message: "User already exists",
      });
    }

    // FIXED: Use enhanced multi-provider geocoding service
    console.log(`🌍 Starting geocoding for address: "${address}"`);
    const geoResult = await geocodingService.geocodeAddress(address);

    console.log(`📍 Geocoding result:`, {
      provider: geoResult.provider,
      coordinates: `${geoResult.latitude}, ${geoResult.longitude}`,
      accuracy: geoResult.accuracy,
      confidence: geoResult.confidence,
    });

    // Create user
    const user = new User({
      email,
      password,
      name,
      role: "organization",
    });
    await user.save();

    // Parse address components
    const addressComponents = address.split(",").map((part) => part.trim());

    // Create organization with enhanced geocoded location
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
        radius: 100, // default 100 meters
        address: geoResult.formatted_address,
        isVerified: true,
        lastUpdated: getISTDate(),
        // Enhanced location metadata
        geocoding: {
          provider: geoResult.provider,
          accuracy: geoResult.accuracy,
          confidence: geoResult.confidence,
          geocodedAt: getISTDate(),
        },
      },
      adminId: user._id,
    });
    await organization.save();

    // Link user to organization
    user.organizationId = organization._id;
    await user.save();

    // Generate QR codes with organization location
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

    // Save QR codes in org
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

// Enhanced user registration
const register_user = async (req, res) => {
  try {
    const { email, name, organizationCode, institute, department, password } =
      req.body;

    if (!email || !organizationCode || !name || !institute || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const organization = await Organization.findOne({ name: organizationCode });
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization code",
      });
    }

    // Create user with temporary password (always use temp password)
    const user = new User({
      email,
      password: "pass123", // Always use temporary password
      name,
      role: "user",
      institute,
      department,
      organizationId: organization._id,
      deviceInfo: {
        isRegistered: false,
      },
    });

    await user.save();

    // ALWAYS send password reset email for every registration
    try {
      const resetToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: "24h" } // 24 hours for initial setup
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

      const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Welcome to Attendance System</h2>
  
  <p>Hello <strong>${name}</strong>,</p>
  
  <p>Your account has been created successfully for <strong>${organization.name}</strong>.</p>
  
  <p>Please set your password by clicking the button below:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Set Your Password</a>
  </div>
  
  <p style="color: #666; font-size: 14px;">This link will expire in 24 hours for security reasons.</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Account Details:</h3>
    <ul style="margin: 0;">
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Organization:</strong> ${organization.name}</li>
      <li><strong>Institute:</strong> ${institute}</li>
      <li><strong>Department:</strong> ${department}</li>
    </ul>
  </div>
  
  <p style="color: #666; font-size: 12px;">If you didn't request this account creation, please contact your administrator.</p>
  
  <p>Best regards,<br>Attendance System Team</p>
</div>
`;

      const emailResult = await sendMail(
        user.email,
        emailSubject,
        emailBody,
        htmlBody
      );

      if (!emailResult.success) {
        console.error("Failed to send welcome email:", emailResult.error);
        // Don't fail registration if email fails, but log it
      } else {
        console.log(`✅ Welcome email sent to: ${user.email}`);
      }
    } catch (emailError) {
      console.error("Email sending error during registration:", emailError);
      // Don't fail registration if email fails
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully. Password reset email sent.",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        institute: user.institute,
        department: user.department,
      },
      organization: {
        id: organization._id,
        name: organization.name,
      },
      accessToken,
      emailSent: true,
      note: "Please check your email to set your password",
    });
  } catch (err) {
    console.error("User registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};  

// Enhanced login with device registration check - FIXED VERSION
const login = async (req, res) => {
  try {
    const { email, password, deviceId, deviceType, deviceFingerprint } =
      req.body;

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
          registeredAt: getISTDate(),
          lastKnownLocation: null,
        };
        console.log(`✅ Device registered for user ${user.email}: ${deviceId}`);
      } else {
        // Check if same device - ENHANCED VALIDATION
        if (user.deviceInfo.deviceId !== deviceId) {
          return res.status(403).json({
            success: false,
            message:
              "Device not authorized. Please request device change from admin.",
            code: "DEVICE_NOT_AUTHORIZED",
            registeredDevice: user.deviceInfo.deviceId,
            currentDevice: deviceId,
            requiresAdminReset: true,
          });
        }
      }
    }

    // Update last login
    user.lastLogin = getISTDate();
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
// Device change request
const requestDeviceChange = async (req, res) => {
  try {
    const { newDeviceId, newDeviceType, newDeviceFingerprint, reason } =
      req.body;

    if (!newDeviceId) {
      return res.status(400).json({
        success: false,
        message: "New device ID is required",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already has pending request
    if (
      user.deviceChangeRequest &&
      user.deviceChangeRequest.status === "pending"
    ) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending device change request",
      });
    }

    user.deviceChangeRequest = {
      newDeviceId,
      newDeviceType: newDeviceType || "unknown",
      newDeviceFingerprint: newDeviceFingerprint || "",
      requestedAt: getISTDate(),
      status: "pending",
    };

    await user.save();

    res.json({
      success: true,
      message: "Device change request submitted successfully",
      request: {
        newDeviceId,
        requestedAt: user.deviceChangeRequest.requestedAt,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Device change request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit device change request",
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
  updateProfile,
  viewProfile,
  refreshToken,
  verifyToken,
  requestDeviceChange,
};
