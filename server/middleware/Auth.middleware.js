const jwt = require("jsonwebtoken");
const User = require("../models/user.models");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token || !token.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token not provided",
        code: "NO_TOKEN",
      });
    }

    const accessToken = token.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (error) {
      console.log(`Auth middleware error: ${error.name}: ${error.message}`);

      let errorCode = "INVALID_TOKEN";
      let errorMessage = "Invalid or expired token";

      if (error.name === "TokenExpiredError") {
        errorCode = "TOKEN_EXPIRED";
        errorMessage = "Token has expired";
      } else if (error.name === "JsonWebTokenError") {
        errorCode = "MALFORMED_TOKEN";
        errorMessage = "Token is malformed";
      } else if (error.name === "NotBeforeError") {
        errorCode = "TOKEN_NOT_ACTIVE";
        errorMessage = "Token is not active yet";
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
        code: errorCode,
        expiredAt: error.expiredAt || null,
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId)
      .populate("organizationId")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or account deactivated",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if organization is still active (if user belongs to one)
    if (user.organizationId && user.organizationId.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Organization is no longer active",
        code: "ORGANIZATION_INACTIVE",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
      code: "SERVER_ERROR",
    });
  }
};

// Optional middleware for checking if token is valid without requiring it
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token || !token.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const accessToken = token.substring(7);

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .populate("organizationId")
        .select("-password");

      req.user = user;
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// 🚨 CRITICAL: Export with proper destructuring support
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;
