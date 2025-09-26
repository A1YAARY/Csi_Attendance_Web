// utils/qrGenerator.js
const QRCode = require("qrcode");
const crypto = require("crypto");

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

async function generateQRCode(
  organizationId,
  location,
  validityMinutes = 30,
  qrType = "check-in"
) {
  const timestamp = Math.floor(getISTDate().getTime() / 1000); // IST seconds
  const code = crypto.randomBytes(8).toString("hex"); // compact unique token

  // Data encoded into the QR image (for UI/debug only)
  const qrPayload = {
    organizationId: String(organizationId),
    qrType,
    location: {
      latitude: Number(location?.latitude ?? 0).toFixed(5),
      longitude: Number(location?.longitude ?? 0).toFixed(5),
      radius: Number(location?.radius ?? 500),
    },
    timestamp,
    code,
    v: "2",
  };

  const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrPayload), {
    errorCorrectionLevel: "M",
    type: "image/png",
    margin: 2,
    width: 300,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Return canonical fields for DB usage
  return { code, timestamp, qrCodeImage };
}

module.exports = { generateQRCode };
