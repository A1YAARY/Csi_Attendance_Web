const geolib = require("geolib");
const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const antiSpoofingMiddleware = async (req, res, next) => {
  try {
    const { location, deviceInfo, code, type } = req.body;
    const user = req.user;

    console.log("🔍 Anti-spoofing middleware - Request data:", {
      hasLocation: !!location,
      hasDeviceInfo: !!deviceInfo,
      code: code || "not provided",
      type: type || "not provided",
      userId: user?._id || "not authenticated"
    });

    // 1. User authentication check
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        spoofingDetected: true,
      });
    }

    // 2. QR Code validation
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: code",
        spoofingDetected: true,
      });
    }

    // 3. Type validation
    if (!type || !["check-in", "check-out"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'check-in' or 'check-out'",
        spoofingDetected: true,
        provided: type,
        required: ["check-in", "check-out"]
      });
    }

    // 4. Location validation
    if (!location || location.latitude === undefined || location.longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Current location (latitude, longitude) is required for attendance",
        spoofingDetected: true,
        code: "LOCATION_REQUIRED"
      });
    }

    // 5. Set defaults
    location.accuracy = location.accuracy || 0;
    location.radius = location.radius || location.accuracy || 500;

    console.log("📍 Location data processed:", {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy
    });

    // 6. Mock location check
    if (
      deviceInfo &&
      (deviceInfo.isMockLocation === true || 
       deviceInfo.isFromMockProvider === true ||
       deviceInfo.mockLocationEnabled === true ||
       deviceInfo.developmentSettingsEnabled === true)
    ) {
      return res.status(400).json({
        success: false,
        message: "Mock/fake location detected. Please disable mock location in device settings.",
        spoofingDetected: true,
        code: "MOCK_LOCATION_DETECTED",
      });
    }

    // 7. Device ID validation for users
    if (user.role === "user") {
      const currentDeviceId = deviceInfo?.deviceId || req.headers['x-device-id'];
      
      if (!currentDeviceId) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required for attendance",
          spoofingDetected: true,
          code: "DEVICE_ID_REQUIRED"
        });
      }

      if (!user.deviceInfo?.isRegistered) {
        console.log("⚠️ Device not registered - controller will handle this");
      }
    }

    console.log("✅ All anti-spoofing checks passed");
    next();

  } catch (error) {
    console.error("❌ Anti-spoofing middleware error:", error);
    
    return res.status(500).json({
      success: false,
      message: "Location verification failed due to server error",
      spoofingDetected: true,
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

module.exports = antiSpoofingMiddleware;
