const jwt = require("jsonwebtoken");
const User = require("../models/user.models");
const { ApiError } = require("../utils/errorHandler"); // New import

// 🔥 OPTIMIZATION: Cache for decoded tokens (in-memory, simple)
const tokenCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    if (!token || !token.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token not provided", {
        code: "NO_TOKEN",
      });
    }

    const accessToken = token.substring(7);
    // Check cache first
    const cached = tokenCache.get(accessToken);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      req.user = cached.user;
      return next();
    }
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
      throw new ApiError(401, errorMessage, {
        code: errorCode,
        expiredAt: error.expiredAt || null,
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId)
      .populate("organizationId", "name _id status settings")
      .select("-password -refreshToken -deviceChangeRequest.adminResponse")
      .lean();
    if (!user) {
      throw new ApiError(404, "User not found or account deactivated", {
        code: "USER_NOT_FOUND",
      });
    }

    // Check if organization is still active (if user belongs to one)
    if (user.organizationId && user.organizationId.status === "inactive") {
      throw new ApiError(403, "Organization is no longer active", {
        code: "ORGANIZATION_INACTIVE",
      });
    } // 🔥 Cache the result
    tokenCache.set(accessToken, {
      user,
      timestamp: Date.now(),
    });

    // Clean cache periodically (every 1000 requests)
    if (tokenCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of tokenCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          tokenCache.delete(key);
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (error instanceof ApiError) {
      throw error; // Re-throw for global handler
    }
    throw new ApiError(500, "Server error during authentication", {
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
