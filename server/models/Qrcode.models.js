const mongoose = require("mongoose");

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
      radius: { type: Number, default: 100 },
    },
    timestamp: { type: Number}, // seconds since epoch
    active: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    qrImageData: String, // Base64 QR image (optional)
  },
  {
    timestamps: true,
  }
);

// Virtuals for IST conversion
qrCodeSchema.virtual("createdAtIST").get(function () {
  return this.createdAt
    ? this.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : null;
});

qrCodeSchema.virtual("updatedAtIST").get(function () {
  return this.updatedAt
    ? this.updatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : null;
});

qrCodeSchema.set("toJSON", { virtuals: true });
qrCodeSchema.set("toObject", { virtuals: true });

qrCodeSchema.index({ organizationId: 1, timestamp: 1 });
qrCodeSchema.index({ code: 1, active: 1 });

module.exports = mongoose.model("QRCode", qrCodeSchema);






// const mongoose = require("mongoose");

// const qrCodeSchema = new mongoose.Schema(
//   {
//     organizationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Organization",
//       required: true,
//     },
//     code: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     qrType: {
//       type: String,
//       enum: ["check-in", "check-out"],
//       required: true,
//     },
//     // location: {
//     //   latitude: {
//     //     type: Number,
//     //     required: true,
//     //   },
//     //   longitude: {
//     //     type: Number,
//     //     required: true,
//     //   },
//     // },
//     active: {
//       type: Boolean,
//       default: true,
//     },
//     usageCount: {
//       type: Number,
//       default: 0,
//     },
//     qrImageData: String, // Base64 encoded QR code image
//   },
//   {
//     timestamps: true,
//   }
// );

// // Virtuals for IST conversion
// qrCodeSchema.virtual("createdAtIST").get(function () {
//   return this.createdAt
//     ? this.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//     : null;
// });

// qrCodeSchema.virtual("updatedAtIST").get(function () {
//   return this.updatedAt
//     ? this.updatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//     : null;
// });


// qrCodeSchema.set("toJSON", { virtuals: true });
// qrCodeSchema.set("toObject", { virtuals: true });


// qrCodeSchema.index({ organizationId: 1, validFrom: 1, validUntil: 1 });
// qrCodeSchema.index({ code: 1, active: 1 });

// module.exports = mongoose.model("QRCode", qrCodeSchema);