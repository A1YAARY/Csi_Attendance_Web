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

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        code:
          error.name === "TokenExpiredError"
            ? "TOKEN_EXPIRED"
            : "INVALID_TOKEN",
        expiredAt: error.expiredAt || null,
      });
    }

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

module.exports = authMiddleware;
