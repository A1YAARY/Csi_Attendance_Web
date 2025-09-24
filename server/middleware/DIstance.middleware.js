const geolib = require("geolib");
const QRCode = require("../models/Qrcode.models");

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const antiSpoofingMiddleware = async (req, res, next) => {
  try {
    const { location, deviceInfo, qrCodeId } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        spoofingDetected: true,
      });
    }

    // Validate location including radius
    if (
      !location ||
      location.latitude === undefined ||
      location.longitude === undefined ||
      location.radius === undefined ||
      location.accuracy === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Precise location, accuracy, and radius are required for attendance",
        spoofingDetected: true,
        required: ["latitude", "longitude", "radius", "accuracy"],
      });
    }

    // Check for mock location
    if (
      deviceInfo &&
      (deviceInfo.isMockLocation || deviceInfo.isFromMockProvider)
    ) {
      return res.status(400).json({
        success: false,
        message: "Mock/fake location detected. Please disable mock location in device settings.",
        spoofingDetected: true,
        code: "MOCK_LOCATION_DETECTED",
      });
    }

    // Accuracy validation
    if (location.accuracy > 100) {
      return res.status(400).json({
        success: false,
        message: `Location accuracy too low (${location.accuracy}m). Please ensure GPS is enabled and try again.`,
        spoofingDetected: true,
        minimumAccuracy: 100,
      });
    }

    // Fetch QR code details
    const qr = await QRCode.findById(qrCodeId);
    if (!qr || !qr.active) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired QR code",
        spoofingDetected: true,
      });
    }

    // Check if user is within QR radius
    const distanceToQR = geolib.getDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: qr.location.latitude, longitude: qr.location.longitude }
    );

    if (distanceToQR > qr.location.radius) {
      return res.status(400).json({
        success: false,
        message: `You are outside the allowed radius (${qr.location.radius}m) of this QR code.`,
        spoofingDetected: true,
        code: "OUTSIDE_QR_RADIUS",
      });
    }

    // QR timestamp validation with IST
    const currentTime = getISTDate().getTime();
    const qrTime = qr.timestamp * 1000;
    if (currentTime - qrTime > 5 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "QR code expired. Please use a fresh QR.",
        spoofingDetected: true,
        code: "QR_EXPIRED",
      });
    }

    // Rapid movement detection
    if (user.deviceInfo && user.deviceInfo.lastKnownLocation) {
      const lastLocation = user.deviceInfo.lastKnownLocation;
      const lastTime = new Date(lastLocation.timestamp).getTime();
      const timeDiff = currentTime - lastTime;

      if (timeDiff < 60000) {
        // less than 1 min
        const distance = geolib.getDistance(
          { latitude: lastLocation.latitude, longitude: lastLocation.longitude },
          { latitude: location.latitude, longitude: location.longitude }
        );

        if (distance > 1000) {
          return res.status(400).json({
            success: false,
            message: `Suspicious movement detected: ${distance}m in ${Math.round(
              timeDiff / 1000
            )}s`,
            spoofingDetected: true,
            code: "RAPID_MOVEMENT_DETECTED",
          });
        }
      }
    }

    // Update user device info with IST
    if (!user.deviceInfo) user.deviceInfo = {};
    user.deviceInfo.lastKnownLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
      accuracy: location.accuracy,
      timestamp: getISTDate(),
    };

    const currentIP = req.ip || req.connection.remoteAddress;
    user.deviceInfo.lastKnownIP = currentIP;
    await user.save();

    // Attach validation result to request
    req.spoofingCheck = {
      passed: true,
      location: location,
      validationsPassed: [
        "location_provided",
        "accuracy_acceptable",
        "no_mock_location",
        "movement_pattern_normal",
        "within_qr_radius",
        "qr_not_expired",
      ],
    };

    console.log("✅ Anti-spoofing checks passed for user:", user.name);
    next();
  } catch (error) {
    console.error("Anti-spoofing middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Location verification failed",
      spoofingDetected: true,
    });
  }
};

module.exports = antiSpoofingMiddleware;
