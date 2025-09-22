const QRCode = require("../models/Qrcode.models");
const qrGenerator = require("../utils/qrGenerator");
const Organization = require("../models/organization.models");

exports.generateNewQRCode = async (req, res) => {
  try {
    const { qrType } = req.body; // Get qrType from request body
    const orgId = req.user.organizationId;

    // Validate qrType
    if (!qrType || !['check-in', 'check-out'].includes(qrType)) {
      return res.status(400).json({ 
        message: "Invalid or missing qrType. Must be 'check-in' or 'check-out' test" 
      });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const { code, qrCodeImage } = await qrGenerator.generateQRCode(
      org._id,
      org.location,
      org.settings.qrCodeValidityMinutes
    );

    const now = Date.now();
    const qrDoc = await QRCode.create({
      organizationId: org._id,
      code,
      qrType: qrType, // Add the required qrType field
      location: org.location,
      qrImageData: qrCodeImage,
      active: true,
    });

    res.json({
      message: `New ${qrType} QR code generated successfully`,
      qr: {
        code: qrDoc.code,
        qrType: qrDoc.qrType,
        qrImageData: qrDoc.qrImageData,
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ message: "QR code generation failed" });
  }
};

exports.getActiveQRCode = async (req, res) => {
  try {
    const { qrType } = req.query; // Expected: "check-in" or "check-out"
    const orgId = req.user.organizationId;
    // const now = new Date();

    const qr = await QRCode.findOne({
      organizationId: orgId,
      qrType: qrType || "check-in",
      active: true,
    });

    if (!qr) {
      return res.status(404).json({ message: "No active QR code found" });
    }

    res.json({
      code: qr.code,
      qrType: qr.qrType,
      qrImageData: qr.qrImageData,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch QR code" });
  }
};

// module.exports = { generateNewQRCode, getActiveQRCode };