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

// Generate permanent QR codes for organization (both check-in and check-out)
exports.generateOrganizationQRCodes = async (req, res) => {
  try {
    const orgId = (
      req.user.organizationId?._id ?? req.user.organizationId
    )?.toString();

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check if QR codes already exist
    const existingQRs = await QRCode.find({ organizationId: org._id });
    
    if (existingQRs.length >= 2) {
      return res.status(400).json({ 
        message: "Organization already has maximum QR codes",
        existingQRs: existingQRs.map(qr => ({
          qrType: qr.qrType,
          code: qr.code,
          qrImageData: qr.qrImageData,
          usageCount: qr.usageCount,
          timestampIST: formatISTDate(new Date(qr.timestamp * 1000))
        }))
      });
    }

    const qrTypes = ["check-in", "check-out"];
    const generatedQRs = [];

    for (const qrType of qrTypes) {
      // Skip if QR already exists for this type
      const existingQR = existingQRs.find(qr => qr.qrType === qrType);
      if (existingQR) {
        generatedQRs.push({
          qrType: existingQR.qrType,
          code: existingQR.code,
          qrImageData: existingQR.qrImageData,
          timestamp: existingQR.timestamp,
          timestampIST: formatISTDate(new Date(existingQR.timestamp * 1000)),
          usageCount: existingQR.usageCount,
          message: `${qrType} QR already exists`
        });
        continue;
      }

      // Generate permanent QR code using your existing qrGenerator
      const { code, timestamp, qrCodeImage } = await generateQRCode(
        org._id,
        org.location,
        null, // No validity minutes for permanent QR
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
        timestamp,
        active: true,
        usageCount: 0,
        qrImageData: qrCodeImage,
      });

      // Update org pointers
      if (qrType === "check-in") {
        org.checkInQRCodeId = qrDoc._id;
      } else {
        org.checkOutQRCodeId = qrDoc._id;
      }

      generatedQRs.push({
        qrType: qrDoc.qrType,
        code: qrDoc.code,
        qrImageData: qrDoc.qrImageData,
        timestamp: qrDoc.timestamp,
        timestampIST: formatISTDate(new Date(qrDoc.timestamp * 1000)),
        usageCount: qrDoc.usageCount,
        message: `${qrType} QR generated successfully - PERMANENT`
      });
    }

    await org.save();

    return res.json({
      message: "Organization QR codes processed successfully",
      qrCodes: generatedQRs,
      totalQRs: generatedQRs.length,
      note: "These QR codes are permanent and do not expire"
    });

  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ 
      message: "QR code generation failed", 
      error: error.message 
    });
  }
};

// Keep your existing generateNewQRCode but make it permanent
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

    // Check if QR already exists for this type
    const existingQR = await QRCode.findOne({
      organizationId: org._id,
      qrType,
      active: true
    });

    if (existingQR) {
      return res.status(400).json({
        message: `${qrType} QR code already exists for this organization`,
        existingQR: {
          code: existingQR.code,
          qrType: existingQR.qrType,
          qrImageData: existingQR.qrImageData,
          timestamp: existingQR.timestamp,
          timestampIST: formatISTDate(new Date(existingQR.timestamp * 1000)),
          usageCount: existingQR.usageCount
        }
      });
    }

    // Generate permanent QR code (no expiry)
    const { code, timestamp, qrCodeImage } = await generateQRCode(
      org._id,
      org.location,
      null, // No validity minutes - permanent
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
      message: `New ${qrType} QR code generated successfully - PERMANENT`,
      qr: {
        code: qrDoc.code,
        qrType: qrDoc.qrType,
        qrImageData: qrDoc.qrImageData,
        timestamp: qrDoc.timestamp,
        timestampIST: formatISTDate(new Date(qrDoc.timestamp * 1000)),
        isPermanent: true,
        note: "This QR code does not expire"
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ 
      message: "QR code generation failed", 
      error: error.message 
    });
  }
};

// Updated getActiveQRCode to show permanent status
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
      timestampIST: formatISTDate(new Date(qr.timestamp * 1000)),
      usageCount: qr.usageCount,
      isPermanent: true,
      isValid: true, // Always valid since permanent
      note: "This QR code is permanent and does not expire"
    });
  } catch (error) {
    console.error("Error fetching QR code:", error);
    res.status(500).json({ 
      message: "Could not fetch QR code", 
      error: error.message 
    });
  }
};

// Get all QR codes for organization
exports.getOrganizationQRCodes = async (req, res) => {
  try {
    const orgId = (
      req.user.organizationId?._id ?? req.user.organizationId
    )?.toString();

    const qrCodes = await QRCode.find({
      organizationId: orgId,
      active: true,
    }).sort({ qrType: 1 }); // Sort by type for consistent order

    if (!qrCodes || qrCodes.length === 0) {
      return res.status(404).json({ 
        message: "No QR codes found for organization",
        suggestion: "Use /generate-organization-qrs to create permanent QR codes"
      });
    }

    const formattedQRs = qrCodes.map(qr => ({
      id: qr._id,
      qrType: qr.qrType,
      code: qr.code,
      qrImageData: qr.qrImageData,
      timestamp: qr.timestamp,
      timestampIST: formatISTDate(new Date(qr.timestamp * 1000)),
      usageCount: qr.usageCount,
      location: qr.location,
      isPermanent: true
    }));

    res.json({
      success: true,
      qrCodes: formattedQRs,
      totalQRs: formattedQRs.length,
      message: "QR codes are permanent and do not expire"
    });

  } catch (error) {
    console.error("Error fetching QR codes:", error);
    res.status(500).json({ 
      message: "Could not fetch QR codes", 
      error: error.message 
    });
  }
};
