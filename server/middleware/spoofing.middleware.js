const User = require("../models/user.models");
const fingerprint = require("../utils/fingerprint");
const { ApiError } = require("../utils/errorHandler"); // New import

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

async function fingerprintCheckMiddleware(req, res, next) {
  try {
    const { fingerprint: fp } = req.body;
    const user = req.user;

    if (!user) {
      throw new ApiError(401, "User not authenticated", { spoofingDetected: true });
    }

    if (!fp) {
      throw new ApiError(400, "Device fingerprint is required for security", { spoofingDetected: true });
    }

    if (!user.deviceInfo) {
      user.deviceInfo = {};
    }

    if (!fingerprint.isFingerprintAllowed(user, fp)) {
      fingerprint.logSuspicious(user, fp);
      await user.save();
      throw new ApiError(403, "Device not authorized. Please register this device first.", {
        spoofingDetected: true,
        action: "device_registration_required",
      });
    }

    // Register fingerprint if first time
    if (!user.deviceInfo.registeredFingerprint) {
      user.deviceInfo.registeredFingerprint = fp;
      user.deviceInfo.registeredFingerprints =
        user.deviceInfo.registeredFingerprints || [];
      user.deviceInfo.registeredFingerprints.push({
        visitorId: fp,
        createdAt: getISTDate(),
        userAgent: req.headers["user-agent"] || "",
        ipAddress: req.ip,
      });
      await user.save();
      console.log("✅ New device fingerprint registered for user:", user.name);
    }

    req.deviceFingerprint = fp;
    next();
  } catch (err) {
    console.error("Fingerprint check middleware error:", err);
    if (err instanceof ApiError) {
      throw err; // Re-throw for global handler
    }
    throw new ApiError(500, "Device verification failed", { spoofingDetected: true });
  }
}

module.exports = fingerprintCheckMiddleware;
