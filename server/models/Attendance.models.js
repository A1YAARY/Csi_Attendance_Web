const mongoose = require("mongoose");

// Helper function for IST
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    qrCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QRCode",
      required: true,
    },
    type: {
      type: String,
      enum: ["check-in", "check-out"],
      required: true,
    },
    // IST timestamp field
    istTimestamp: {
      type: Date,
      default: () => getISTDate()
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      accuracy: Number,
    },
    deviceInfo: {
      deviceId: String,
      platform: String,
      userAgent: String,
      ipAddress: String,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationDetails: {
      locationMatch: Boolean,
      qrCodeValid: Boolean,
      deviceTrusted: Boolean,
      spoofingDetected: Boolean,
    },
    notes: String,
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// IST Virtuals
attendanceSchema.virtual("createdAtIST").get(function () {
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

attendanceSchema.virtual("updatedAtIST").get(function () {
  return this.updatedAt
    ? this.updatedAt.toLocaleString("en-IN", { 
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

attendanceSchema.virtual("istTimestampIST").get(function () {
  return this.istTimestamp
    ? this.istTimestamp.toLocaleString("en-IN", { 
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

// Middleware to ensure IST timestamp
attendanceSchema.pre("save", function (next) {
  if (!this.istTimestamp) {
    this.istTimestamp = getISTDate();
  }
  next();
});

attendanceSchema.index({ userId: 1, createdAt: -1 });
attendanceSchema.index({ organizationId: 1, createdAt: -1 });
attendanceSchema.index({ createdAt: 1 }); // For cleanup cron job
attendanceSchema.index({ istTimestamp: 1 }); // For IST queries

module.exports = mongoose.model("Attendance", attendanceSchema);
