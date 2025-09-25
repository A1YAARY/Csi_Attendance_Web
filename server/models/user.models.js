const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Helper function for IST
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const DeviceRequestSchema = new mongoose.Schema({
  newDeviceId: {
    type: String,
    required: true
  },
  newDeviceType: String,
  newDeviceFingerprint: String,
  requestedAt: {
    type: Date,
    default: () => getISTDate()
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
  },
  role: {
    type: String,
    enum: ["organization", "user"],
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: function () {
      return this.role === "user";
    },
  },
  lastActivity: {
    type: Boolean,
    default: false,
  },
  // Enhanced device management
  deviceInfo: {
    deviceId: String,
    deviceType: String,
    deviceFingerprint: String,
    isRegistered: {
      type: Boolean,
      default: false
    },
    registeredAt: Date,
    lastKnownLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      timestamp: {
        type: Date,
        default: () => getISTDate()
      },
    },
  },
  // Device change requests
  deviceChangeRequest: DeviceRequestSchema,
  workingHours: {
    start: {
      type: String,
      default: "09:00",
    },
    end: {
      type: String,
      default: "17:00",
    },
  },
  lastLogin: {
    type: Date,
    default: () => getISTDate()
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  refreshToken: String,
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// IST Virtuals
userSchema.virtual("createdAtIST").get(function () {
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

userSchema.virtual("updatedAtIST").get(function () {
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

userSchema.virtual("lastLoginIST").get(function () {
  return this.lastLogin
    ? this.lastLogin.toLocaleString("en-IN", { 
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

// bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS, 10));
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update lastLogin to IST before saving
userSchema.pre("save", function (next) {
  if (this.isModified("lastLogin") && this.lastLogin) {
    this.lastLogin = getISTDate(this.lastLogin);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
