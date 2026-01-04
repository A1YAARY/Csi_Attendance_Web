// server/config/Database.js
const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10, // 🔥 REDUCED from 20 (more efficient)
      minPoolSize: 2, // 🔥 REDUCED from 5 (saves resources)
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: "majority",
      readPreference: "primaryPreferred", // 🔥 CHANGED: Allows reads from secondaries
      readConcern: { level: "majority" }, // 🔥 CHANGED: Better consistency
      compressors: ["zlib"], // 🔥 NEW: Enable compression
      zlibCompressionLevel: 6, // 🔥 NEW: Compression level
    });

    // Health check
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("📡 MongoDB connection established");

    // 🔥 NEW: Enable query profiling for slow queries
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", true);
    }

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📡 MongoDB disconnected");
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (err) {
    console.error("❌ Error closing database connection:", err);
  }
}

module.exports = { connectDB, closeDB };
