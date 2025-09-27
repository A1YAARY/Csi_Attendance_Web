// models/DailyTimeSheet.models.js
const mongoose = require('mongoose');
const istUtils = require('../utils/istDateTimeUtils');

const sessionSchema = new mongoose.Schema(
  {
    checkIn: {
      time: { type: Date, required: true },
      attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
    },
    checkOut: {
      time: { type: Date },
      attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
    },
    duration: { type: Number, default: 0 }, // in minutes
  },
  { _id: true, timestamps: false }
);

const dailyTimeSheetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    date: {
      type: Date,
      required: true,
      default: () => istUtils.getStartOfDayIST(),
    },
    sessions: [sessionSchema],
    totalWorkingTime: { type: Number, default: 0 }, // minutes
    requiredWorkingHours: { type: Number, default: 480 }, // minutes
    status: { type: String, enum: ['absent', 'present', 'half-day', 'full-day', 'holiday'], default: 'absent' },
    createdAt: { type: Date, default: () => istUtils.getISTDate() },
    updatedAt: { type: Date, default: () => istUtils.getISTDate() },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtuals
dailyTimeSheetSchema.virtual('dateIST').get(function () {
  return this.date
    ? this.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    : null;
});

dailyTimeSheetSchema.virtual('hasActiveSession').get(function () {
  return this.sessions.some(s => s.checkIn?.time && !s.checkOut?.time);
});

// Pre-save: keep updatedAt in IST and normalize date to IST start-of-day
dailyTimeSheetSchema.pre('save', function (next) {
  this.updatedAt = istUtils.getISTDate();
  if (this.isModified('date') && this.date) this.date = istUtils.getStartOfDayIST(this.date);
  next();
});

// Methods
dailyTimeSheetSchema.methods.addCheckInSession = function ({ time, attendanceId }) {
  this.sessions.push({ checkIn: { time, attendanceId } });
};

dailyTimeSheetSchema.methods.addCheckOutToActiveSession = function ({ time, attendanceId }) {
  const idx = this.sessions.findIndex(s => s.checkIn?.time && !s.checkOut?.time);
  if (idx === -1) throw new Error('No active session found for check-out');
  this.sessions[idx].checkOut = { time, attendanceId };
  const dur = Math.max(0, (new Date(time) - new Date(this.sessions[idx].checkIn.time)) / (1000 * 60));
  this.sessions[idx].duration = Math.round(dur);
  return this.sessions[idx];
};

dailyTimeSheetSchema.methods.updateTotalWorkingTime = function () {
  this.totalWorkingTime = this.sessions.reduce((t, s) => t + (s.duration || 0), 0);
  if (this.totalWorkingTime >= 420) this.status = 'full-day';
  else if (this.totalWorkingTime >= 240) this.status = 'half-day';
  else if (this.totalWorkingTime > 0) this.status = 'present';
  else this.status = 'absent';
};

// Indexes
dailyTimeSheetSchema.index({ userId: 1, organizationId: 1, date: -1 }, { unique: true });
dailyTimeSheetSchema.index({ date: -1 });

module.exports = mongoose.model('DailyTimeSheet', dailyTimeSheetSchema);
