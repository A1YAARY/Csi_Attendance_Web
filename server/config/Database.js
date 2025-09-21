const mongoose = require("mongoose");
require("dotenv").config();

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://aryanmadkar70_db_user:aryan@cluster0.oxxw1kn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      // 🔥 PERFORMANCE: Connection pooling
      maxPoolSize: 20, // Max concurrent connections
      minPoolSize: 5, // Min connections to maintain
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // 🔥 PERFORMANCE: Write optimizations
      retryWrites: true,
      w: "majority", // Write concern for data safety

      // 🔥 PERFORMANCE: Read optimizations
      readPreference: "primary",
      readConcern: { level: "local" },
    });

    // Test connection with ping
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ MongoDB connected with optimized settings");

    // Connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("📡 MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📡 MongoDB disconnected");
    });

    // Graceful close on app termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  } // FIXED: Added missing closing brace
};

module.exports = connectDB;
