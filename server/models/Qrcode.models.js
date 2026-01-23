const mongoose = require("mongoose");

// Helper function for IST
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const qrCodeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    qrType: {
      type: String,
      enum: ["check-in", "check-out"],
      required: true,
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      radius: { type: Number, default: 600 },
    },
    timestamp: {
      type: Number,
      default: () => Math.floor(getISTDate().getTime() / 1000)
    }, // IST seconds since epoch
    active: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    qrImageData: String, // Base64 QR image (optional)
    // Remove any expiry-related fields
    isPermanent: {
      type: Boolean,
      default: true, // All QR codes are now permanent
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add compound unique index to ensure only one QR per type per organization
qrCodeSchema.index({ organizationId: 1, qrType: 1 }, { unique: true });

// Existing virtuals and middleware remain the same...
qrCodeSchema.virtual("createdAtIST").get(function () {
  return this.createdAt
    ? this.createdAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : null;
});

module.exports = mongoose.model("QRCode", qrCodeSchema);
