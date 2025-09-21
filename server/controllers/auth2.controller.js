const express = require("express");
const User = require("../models/user.models");
const Organization = require("../models/organization.models");
const jwt = require("jsonwebtoken");
const qrGenerator = require("../utils/qrGenarator");
const QRCode = require("../models/Qrcode.models");
const { sendMail } = require("../utils/mailer");

// 🔑 EXTENDED TOKEN GENERATION - Tokens last for months
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "90d" } // 🚀 Extended to 90 days (3 months)
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "180d" } // 🚀 Extended to 180 days (6 months)
  );

  return { accessToken, refreshToken };
};

// 🔄 NEW: Token refresh endpoint
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not provided",
        code: "NO_REFRESH_TOKEN"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN"
      });
    }

    const user = await User.findById(decoded.userId).populate("organizationId");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
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
      organization: user.organizationId ? {
        id: user.organizationId._id,
        name: user.organizationId.name,
      } : null,
      accessToken,
    });

  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during token refresh",
      code: "SERVER_ERROR"
    });
  }
};

const register_orginization = async (req, res) => {
  try {
    const { email, password, name, organizationName } = req.body;

    if (!email || !password || !name || !organizationName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = new User({
      email,
      password,
      name,
      role: "organization",
    });
    await user.save();

    // Create organization
    const organization = new Organization({
      name: organizationName,
      adminId: user._id,
    });
    await organization.save();

    // Link user to organization
    user.organizationId = organization._id;
    await user.save();

    // Generate check-in QR
    const checkInQR = await qrGenerator.generateQRCode(
      organization._id,
      organization.location
    );
    const checkInQRDoc = await QRCode.create({
      organizationId: organization._id,
      code: checkInQR.code,
      qrType: "check-in",
      qrImageData: checkInQR.qrCodeImage,
      active: true,
    });

    // Generate check-out QR
    const checkOutQR = await qrGenerator.generateQRCode(
      organization._id,
      organization.location
    );
    const checkOutQRDoc = await QRCode.create({
      organizationId: organization._id,
      code: checkOutQR.code,
      qrType: "check-out",
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
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
    });

    res.status(201).json({
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
        checkInQRCode: checkInQRDoc.code,
        checkOutQRCode: checkOutQRDoc.code,
      },
      accessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const register_user = async (req, res) => {
  try {
    const { email, name, organizationCode, institute, department, password } = req.body;

    if (!email || !organizationCode || !name || !institute || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const organization = await Organization.findOne({ name: organizationCode });
    if (!organization) {
      return res.status(400).json({ message: "Invalid organization code" });
    }

    const user = new User({
      email,
      password,
      name,
      role: "user",
      institute,
      department,
      organizationId: organization._id,
    });
    await user.save();

    // 🔹 Generate reset token immediately after registration
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_RESET_SECRET,
      { expiresIn: "24h" } // Extended to 24 hours
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // 🔹 Send reset password email
    await sendMail(
      user.email,
      "Set Your Account Password",
      `<h3>Welcome to ${organization.name}</h3>
       <p>You've been added to the organization. Please set your password:</p>
       <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Password</a>
       <p>This link will expire in 24 hours.</p>`
    );

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).populate("organizationId");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: user.organizationId ? {
        id: user.organizationId._id,
        name: user.organizationId.name,
      } : null,
      accessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
      return res.status(404).json({ message: "User not found" });
    }

    const response = {
      ...user.toObject(),
      organization: user.organizationId || null,
    };

    res.json(response);
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
};

const viewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("organizationId", "name")
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const response = {
      ...user.toObject(),
      organization: user.organizationId || null,
    };

    res.json(response);
  } catch (error) {
    console.error("View profile error:", error);
    res.status(500).json({ message: "Failed to retrieve user profile" });
  }
};

const logout = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  register_orginization,
  register_user,
  login,
  logout,
  updateProfile,
  viewProfile,
  refreshToken, // 🆕 New refresh endpoint
};
