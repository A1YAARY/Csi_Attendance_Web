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
    // Extract data - handle both formats for compatibility
    const {
      location,
      deviceInfo,
      code,
      qrCode,
      type,
      latitude,
      longitude,
      accuracy
    } = req.body;

    const user = req.user;

    console.log("🔍 Anti-spoofing middleware - Request data:", {
      hasLocation: !!location,
      hasLatLng: latitude !== undefined && longitude !== undefined,
      hasDeviceInfo: !!deviceInfo,
      code: code || qrCode || "not provided",
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

    // 2. QR Code validation - handle both 'code' and 'qrCode' fields
    const qrCodeValue = qrCode || code;
    if (!qrCodeValue) {
      return res.status(400).json({
        success: false,
        message: "QR code is required",
        spoofingDetected: true,
        code: "QR_CODE_REQUIRED"
      });
    }

    // 3. Normalize QR code field for controller
    req.body.qrCode = qrCodeValue;

    // 4. Location validation - handle both formats
    let lat, lng, acc;

    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      // Location object format
      lat = location.latitude;
      lng = location.longitude;
      acc = location.accuracy ?? accuracy ?? 10;
    } else if (latitude !== undefined && longitude !== undefined) {
      // Flat format
      lat = latitude;
      lng = longitude;
      acc = accuracy ?? 10;
    } else {
      return res.status(400).json({
        success: false,
        message: "Current location (latitude, longitude) is required for attendance",
        spoofingDetected: true,
        code: "LOCATION_REQUIRED"
      });
    }

    // 5. Coerce to numbers and validate for obvious bad values (0/0, NaN, out-of-bounds)
    lat = Number(lat);
    lng = Number(lng);
    acc = Number(acc) || 10;

    if (
      (lat === 0 && lng === 0) ||
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid current location is required",
        spoofingDetected: true,
        code: "LOCATION_REQUIRED",
      });
    }

    // 6. Normalize location data for controller
    req.body.latitude = lat;
    req.body.longitude = lng;
    req.body.accuracy = acc;

    // Also set location object for any middleware that might need it
    req.body.location = {
      latitude: lat,
      longitude: lng,
      accuracy: acc
    };

    console.log("📍 Location data processed:", {
      latitude: lat,
      longitude: lng,
      accuracy: acc
    });

    // 7. Type validation (optional since QR contains type info)
    if (type && !["check-in", "check-out"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'check-in' or 'check-out'",
        spoofingDetected: true,
        provided: type,
        required: ["check-in", "check-out"]
      });
    }

    // 8. Mock location check
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

    // 9. Device ID validation for users
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
    console.log("📤 Passing to controller with normalized data:", {
      qrCode: req.body.qrCode,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracy: req.body.accuracy
    });

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
