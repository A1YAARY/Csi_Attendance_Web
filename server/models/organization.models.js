const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      fullAddress: String, // Complete address string
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      radius: { type: Number, default: 100 }, // meters
      address: String, // Geocoded address
      isVerified: { type: Boolean, default: false },
      lastUpdated: Date,
      // FIXED: Added geocoding metadata with CORRECT enum values
      geocoding: {
        provider: {
          type: String,
          enum: [
            'nominatim', 
            'here', 
            'mapbox', 
            'fallback', 
            'locationiq', 
            'positionstack', 
            'photon', 
            'geoapify',
            'manual_verified',  // ✅ ADDED THIS TO FIX THE ERROR
            'known_location'    // ✅ ADDED ALTERNATIVE NAME
          ],
          default: 'nominatim'
        },
        accuracy: {
          type: String,
          enum: ['exact', 'street', 'neighborhood', 'city', 'region'],
          default: 'city'
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.5
        },
        alternateResults: [{
          provider: String,
          latitude: Number,
          longitude: Number,
          confidence: Number,
          accuracy: String
        }],
        isConsistent: { type: Boolean, default: false },
        geocodedAt: Date
      }
    },
    settings: {
      timezone: { type: String, default: "Asia/Kolkata" },
      qrCodeValidityMinutes: { type: Number, default: 30 },
      locationToleranceMeters: { type: Number, default: 500 },
      requireDeviceRegistration: { type: Boolean, default: true },
      strictLocationVerification: { type: Boolean, default: true },
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    checkInQRCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QRCode",
    },
    checkOutQRCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QRCode",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals for IST
organizationSchema.virtual("createdAtIST").get(function () {
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

organizationSchema.virtual("updatedAtIST").get(function () {
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

// Index for geospatial queries
organizationSchema.index({ "location.latitude": 1, "location.longitude": 1 });

module.exports = mongoose.model("Organization", organizationSchema);
