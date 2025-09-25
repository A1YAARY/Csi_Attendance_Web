const User = require("../models/user.models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendMail } = require("../utils/mailer");

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).populate("organizationId");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send password reset email
    const emailSubject = "Password Reset Request - Attendance System";
    const emailBody = `
Hello ${user.name},

You have requested to reset your password for the Attendance System.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Organization: ${user.organizationId?.name || "N/A"}
Email: ${user.email}

Best regards,
Attendance System Team
    `;

    await sendMail(user.email, emailSubject, emailBody);

    res.json({
      success: true,
      message: "Password reset link sent to your email",
      data: {
        email: user.email,
        resetTokenExpiry: "1 hour",
      },
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, new password, and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
      );
    } catch (error) {
      let errorMessage = "Invalid or expired reset token";
      if (error.name === "TokenExpiredError") {
        errorMessage = "Reset token has expired. Please request a new one.";
      }
      return res.status(401).json({
        success: false,
        message: errorMessage,
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
      data: {
        email: user.email,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  requestPasswordReset,
  resetPassword,
};
