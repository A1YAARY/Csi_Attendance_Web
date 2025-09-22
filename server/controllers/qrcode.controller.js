const QRCode = require("../models/Qrcode.models");
const Organization = require("../models/organization.models");
const { generateQRCode } = require("../utils/qrGenerator");

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

    const { code, timestamp, qrCodeImage } = await generateQRCode(
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
        radius: Number(org.location?.radius ?? 100),
      },
      timestamp,
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

    res.json({
      code: qr.code,
      qrType: qr.qrType,
      qrImageData: qr.qrImageData,
      timestamp: qr.timestamp,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch QR code" });
  }
};
