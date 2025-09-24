const mongoose = require("mongoose");

// Helper function for IST
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const startOfISTDay = (date = new Date()) => {
  const d = getISTDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

const dailyTimeSheetSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
      default: () => startOfISTDay()
    },
    sessions: [
      {
        checkIn: {
          time: {
            type: Date,
            default: () => getISTDate()
          },
          attendanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
          },
        },
        checkOut: {
          time: {
            type: Date,
            default: () => getISTDate()
          },
          attendanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
          },
        },
        duration: Number, // in minutes
      },
    ],
    totalWorkingTime: {
      type: Number, // in minutes
      default: 0,
    },
    status: {
      type: String,
      enum: ["absent", "half-day", "full-day"],
      default: "absent",
    },
    requiredWorkingHours: {
      type: Number,
      default: 480, // 8 hours in minutes
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// IST Virtuals
dailyTimeSheetSchema.virtual("createdAtIST").get(function () {
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

dailyTimeSheetSchema.virtual("updatedAtIST").get(function () {
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

dailyTimeSheetSchema.virtual("dateIST").get(function () {
  return this.date
    ? this.date.toLocaleDateString("en-IN", { 
        timeZone: "Asia/Kolkata",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    : null;
});

// Middleware to ensure IST date
dailyTimeSheetSchema.pre("save", function (next) {
  if (!this.date) {
    this.date = startOfISTDay();
  }
  next();
});

// Indexes for performance
dailyTimeSheetSchema.index({ userId: 1, date: -1 });
dailyTimeSheetSchema.index({ organizationId: 1, date: -1 });
dailyTimeSheetSchema.index({ date: 1 });

module.exports = mongoose.model("DailyTimeSheet", dailyTimeSheetSchema);
