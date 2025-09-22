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

    // Optional health ping
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
    process.exit(1); // stop server if DB connection fails
  }
}

module.exports = connectDB;
