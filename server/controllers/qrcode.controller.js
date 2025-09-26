const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");
const { generateQRCode } = require("../utils/qrGenerator");

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const formatISTDate = (date) => {
  return new Date(date).toLocaleString("en-IN", { 
    timeZone: "Asia/Kolkata",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

exports.generateNewQRCode = async (req, res) => {
  try {
    const { qrType } = req.body;
    const orgId = (
      req.user.organizationId?._id ?? req.user.organizationId
    )?.toString();

    if (!qrType || !["check-in", "check-out"].includes(qrType)) {
      return res
        .status(400)
        .json({
          message:
            "Invalid or missing qrType. Must be 'check-in' or 'check-out'",
        });
    }

    const org = await Organization.findById(orgId);
    if (!org)
      return res.status(404).json({ message: "Organization not found" });

    // Deactivate any existing active QR for this type
    await QRCode.updateMany(
      { organizationId: org._id, qrType, active: true },
      { $set: { active: false } }
    );

    // Generate QR with IST timestamp
    const istTimestamp = Math.floor(getISTDate().getTime() / 1000);
    const { code, qrCodeImage } = await generateQRCode(
      org._id,
      org.location,
      org.settings?.qrCodeValidityMinutes ?? 30,
      qrType
    );

    const qrDoc = await QRCode.create({
      organizationId: org._id,
      code,
      qrType,
      location: {
        latitude: Number(org.location?.latitude ?? 0),
        longitude: Number(org.location?.longitude ?? 0),
        radius: Number(org.location?.radius ?? 500),
      },
      timestamp: istTimestamp,
      active: true,
      usageCount: 0,
      qrImageData: qrCodeImage,
    });

    // Update org pointer for convenience
    if (qrType === "check-in") org.checkInQRCodeId = qrDoc._id;
    else org.checkOutQRCodeId = qrDoc._id;
    await org.save();

    return res.json({
      message: `New ${qrType} QR code generated successfully`,
      qr: {
        code: qrDoc.code,
        qrType: qrDoc.qrType,
        qrImageData: qrDoc.qrImageData,
        timestamp: qrDoc.timestamp,
        timestampIST: formatISTDate(new Date(qrDoc.timestamp * 1000)),
        validUntil: formatISTDate(new Date((qrDoc.timestamp + (org.settings?.qrCodeValidityMinutes ?? 30) * 60) * 1000)),
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ message: "QR code generation failed" });
  }
};

exports.getActiveQRCode = async (req, res) => {
  try {
    const { qrType } = req.query;
    const orgId = (
      req.user.organizationId?._id ?? req.user.organizationId
    )?.toString();

    const qr = await QRCode.findOne({
      organizationId: orgId,
      qrType: qrType || "check-in",
      active: true,
    });

    if (!qr)
      return res.status(404).json({ message: "No active QR code found" });

    // Get organization for validity calculation
    const org = await Organization.findById(orgId);
    const validityMinutes = org?.settings?.qrCodeValidityMinutes ?? 30;

    res.json({
      code: qr.code,
      qrType: qr.qrType,
      qrImageData: qr.qrImageData,
      timestamp: qr.timestamp,
      timestampIST: formatISTDate(new Date(qr.timestamp * 1000)),
      validUntil: formatISTDate(new Date((qr.timestamp + validityMinutes * 60) * 1000)),
      isValid: Math.floor(getISTDate().getTime() / 1000) - qr.timestamp <= validityMinutes * 60,
    });
  } catch (error) {
    console.error("Error fetching QR code:", error);
    res.status(500).json({ message: "Could not fetch QR code" });
  }
};
