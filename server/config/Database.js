// server/config/Database.js

const mongoose = require("mongoose");

require("dotenv").config();

const uri = process.env.MONGODB_URI;

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: "majority",
      readPreference: "primary",
      readConcern: { level: "local" },
    });

    // Health check
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("📡 MongoDB connection established");

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📡 MongoDB disconnected");
    });

  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1); // Exit if DB connection fails
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
