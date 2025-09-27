// models/Attendance.models.js
const mongoose = require('mongoose');
const istUtils = require('../utils/istDateTimeUtils');

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    qrCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', required: true },
    type: { type: String, enum: ['check-in', 'check-out'], required: true },

    // Primary IST timestamp for the scan
    istTimestamp: { type: Date, default: () => istUtils.getISTDate() },

    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: Number,
    },

    deviceInfo: {
      deviceId: String,
      platform: String,
      userAgent: String,
      ipAddress: String,
    },

    verified: { type: Boolean, default: true },
    verificationDetails: {
      locationMatch: Boolean,
      qrCodeValid: Boolean,
      deviceTrusted: Boolean,
      spoofingDetected: Boolean,
    },
    notes: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtuals in IST
attendanceSchema.virtual('createdAtIST').get(function () {
  return this.createdAt
    ? this.createdAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    : null;
});

attendanceSchema.virtual('updatedAtIST').get(function () {
  return this.updatedAt
    ? this.updatedAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    : null;
});

attendanceSchema.virtual('istTimestampIST').get(function () {
  return this.istTimestamp
    ? this.istTimestamp.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    : null;
});

// Ensure istTimestamp exists
attendanceSchema.pre('save', function (next) {
  if (!this.istTimestamp) this.istTimestamp = istUtils.getISTDate();
  next();
});

// Helpful indexes
attendanceSchema.index({ userId: 1, createdAt: -1 });
attendanceSchema.index({ organizationId: 1, createdAt: -1 });
attendanceSchema.index({ istTimestamp: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
