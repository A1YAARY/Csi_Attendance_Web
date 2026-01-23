const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const DateTimeUtils = require("../utils/dateTimeUtils");

const DeviceRequestSchema = new mongoose.Schema({
  newDeviceId: {
    type: String,
    required: true
  },
  newDeviceType: String,
  newDeviceFingerprint: String,
  requestedAt: {
    type: Date,
    default: () => DateTimeUtils.getISTDate()
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  adminResponse: {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    respondedAt: Date,
    reason: String
  }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  name: {
    type: String,
    required: true
  },
  institute: {
    type: String,
  },
  department: {
    type: String,
    default: "cmpn"
  },
  phone: {
    type: String,
  },
  role: {
    type: String,
    enum: ["user", "organization"],
    default: "user",
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },
  deviceInfo: {
    isRegistered: {
      type: Boolean,
      default: false,
    },
    deviceId: {
      type: String,
    },
    deviceType: String,
    deviceFingerprint: String,
    registeredAt: {
      type: Date,
      default: () => DateTimeUtils.getISTDate()
    },
    lastKnownLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    },
  },
  // Enhanced working hours and holiday support
  workingHours: {
    start: {
      type: String,
      default: "09:00"
    },
    end: {
      type: String,
      default: "17:00"
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata"
    }
  },
  // Custom holidays for individual users
  customHolidays: [{
    date: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringType: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
      default: null
    }
  }],
  // Weekly schedule (for users with different weekly patterns)
  weeklySchedule: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  deviceChangeRequest: DeviceRequestSchema,
  refreshToken: String,
  lastLogin: {
    type: Date,
    default: () => DateTimeUtils.getISTDate()
  },
  createdAt: {
    type: Date,
    default: () => DateTimeUtils.getISTDate()
  },
  updatedAt: {
    type: Date,
    default: () => DateTimeUtils.getISTDate()
  }
});

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
userSchema.pre("save", function(next) {
  this.updatedAt = DateTimeUtils.getISTDate();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has holiday on a specific date
userSchema.methods.hasCustomHoliday = function(date) {
  const checkDate = new Date(date);
  return this.customHolidays.some(holiday => {
    const holidayDate = new Date(holiday.date);
    
    if (!holiday.isRecurring) {
      // One-time holiday
      return DateTimeUtils.isSameDayIST(holidayDate, checkDate);
    } else {
      // Recurring holiday
      switch (holiday.recurringType) {
        case 'weekly':
          return holidayDate.getDay() === checkDate.getDay();
        case 'monthly':
          return holidayDate.getDate() === checkDate.getDate();
        case 'yearly':
          return holidayDate.getMonth() === checkDate.getMonth() && 
                 holidayDate.getDate() === checkDate.getDate();
        default:
          return false;
      }
    }
  });
};

// Check if user should work on a specific day of week
userSchema.methods.shouldWorkOnDay = function(dayOfWeek) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dayOfWeek];
  return this.weeklySchedule[dayName] || false;
};

module.exports = mongoose.model("User", userSchema);
