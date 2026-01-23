const mongoose = require('mongoose');

// Session sub-schema for check-in/check-out
const sessionSchema = new mongoose.Schema({
  checkIn: {
    time: { type: Date },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  },
  checkOut: {
    time: { type: Date },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  },
  sessionDuration: {
    type: Number,
    default: 0,
  },
}, { _id: true });

const dailyTimeSheetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  sessions: [sessionSchema],
  totalWorkingTime: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['absent', 'present', 'half-day', 'full-day', 'weekly-off', 'custom-holiday', 'public-holiday'],
    default: 'absent',
  },
  // Manual entry support
  isManualEntry: {
    type: Boolean,
    default: false,
  },
  manualEntryDetails: {
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    markedByName: {
      type: String,
    },
    markedAt: {
      type: Date,
    },
    reason: {
      type: String,
    },
  },
  // Holiday tracking
  isWeeklyOff: {
    type: Boolean,
    default: false,
  },
  isCustomHoliday: {
    type: Boolean,
    default: false,
  },
  isPublicHoliday: {
    type: Boolean,
    default: false,
  },
  hasActiveSession: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Instance method: Add check-in session
dailyTimeSheetSchema.methods.addCheckInSession = function (checkInData) {
  this.sessions.push({
    checkIn: checkInData,
    checkOut: {},
    sessionDuration: 0,
  });
  this.hasActiveSession = true;
};

// Instance method: Add check-out to active session
dailyTimeSheetSchema.methods.addCheckOutToActiveSession = function (checkOutData) {
  const activeSession = this.sessions.find(s => s.checkIn?.time && !s.checkOut?.time);
  if (!activeSession) {
    throw new Error('No active check-in session found');
  }
  activeSession.checkOut = checkOutData;
  const duration = Math.floor((checkOutData.time - activeSession.checkIn.time) / (1000 * 60));
  activeSession.sessionDuration = Math.max(0, duration);
  this.hasActiveSession = false;
};

// Instance method: Update total working time
dailyTimeSheetSchema.methods.updateTotalWorkingTime = function () {
  this.totalWorkingTime = this.sessions.reduce((sum, session) => sum + (session.sessionDuration || 0), 0);

  // Update status based on working time
  if (this.totalWorkingTime >= 480) {
    this.status = 'full-day';
  } else if (this.totalWorkingTime >= 240) {
    this.status = 'half-day';
  } else if (this.totalWorkingTime > 0) {
    this.status = 'present';
  } else if (!this.isWeeklyOff && !this.isCustomHoliday && !this.isPublicHoliday) {
    this.status = 'absent';
  }
};

// Indexes for efficient queries
dailyTimeSheetSchema.index({ userId: 1, date: 1 });
dailyTimeSheetSchema.index({ organizationId: 1, date: 1 });
dailyTimeSheetSchema.index({ userId: 1, organizationId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyTimeSheet', dailyTimeSheetSchema);
