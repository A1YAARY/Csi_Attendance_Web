const QRCode = require('qrcode');
const crypto = require('crypto');
const { ApiError } = require('../utils/errorHandler'); // New import

// Generate a unique QR code token
function generateQRToken(organizationId, type, validityMinutes = 30) {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiresAt = timestamp + (validityMinutes * 60);
  const random = crypto.randomBytes(16).toString('hex');
  return `${organizationId}:${type}:${timestamp}:${expiresAt}:${random}`;
}

// Generate QR code with location data embedded
async function generateQRCode(organizationId, location, validityMinutes = 30, type = 'check-in') {
  try {
    if (!organizationId || !location || !location.latitude || !location.longitude) {
      throw new ApiError(400, 'Invalid parameters for QR generation', {
        code: 'INVALID_QR_PARAMS',
        required: ['organizationId', 'location.latitude', 'location.longitude'],
      });
    }

    // Generate unique token
    const code = generateQRToken(organizationId, type, validityMinutes);

    // Embed data in QR payload
    const qrData = {
      orgId: organizationId,
      type: type,
      timestamp: Math.floor(Date.now() / 1000),
      location: {
        lat: location.latitude,
        lng: location.longitude,
        radius: location.radius || 100,
      },
      expiresAt: Math.floor(Date.now() / 1000) + (validityMinutes * 60),
      token: code,
    };

    // Generate QR code image as base64
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    });

    return {
      code: code,
      qrType: type,
      qrCodeImage: qrCodeImage,
      data: qrData,
      validityMinutes: validityMinutes,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('QR Generation error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to generate QR code', {
      code: 'QR_GENERATION_FAILED',
      type: type,
      organizationId: organizationId,
    });
  }
}

// Validate QR code (check expiry, etc.)
function validateQRCode(qrData, currentTime = Math.floor(Date.now() / 1000)) {
  try {
    if (!qrData || !qrData.expiresAt) {
      throw new ApiError(400, 'Invalid QR data structure');
    }

    const isValid = currentTime <= qrData.expiresAt;
    const remainingSeconds = isValid ? qrData.expiresAt - currentTime : 0;

    return {
      isValid: isValid,
      expired: !isValid,
      remainingTime: remainingSeconds,
      expiryTime: qrData.expiresAt,
      type: qrData.type,
      orgId: qrData.orgId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, 'QR validation failed', { code: 'QR_VALIDATION_ERROR' });
  }
}

module.exports = {
  generateQRCode,
  validateQRCode,
  generateQRToken, // For internal use
};
