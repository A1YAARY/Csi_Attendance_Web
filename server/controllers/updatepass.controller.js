const bcrypt = require("bcrypt");
const User = require("../models/user.models");

async function  updatePassword(req, res) {
  try {
    const userId = req.user && req.user.userId; // Changed from req.user.id to req.user.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found"
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password, and confirm password are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Check if new password is same as current password
    const isSameAsCurrent = await user.comparePassword(newPassword);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as current password"
      });
    }

    // Update password - let the user model's pre-save hook handle hashing
    user.password = newPassword;
    user.updatedAt = DateTimeUtils.getISTDate(); // Use your DateTimeUtils

    await user.save();

    console.log(`✅ Password updated successfully for user: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("updatePassword error", err);
    return res.status(500).json({
      success: false,
      message: "Server error during password update",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}

module.exports = { updatePassword };
