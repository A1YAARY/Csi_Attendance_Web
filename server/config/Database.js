const mongoose = require("mongoose");
// require("dotenv").config();
import 'dotenv/config';

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

      // ✅ REMOVED DEPRECATED OPTIONS:
      // - keepAlive: true (deprecated)
      // - keepAliveInitialDelay: 30000 (deprecated)
      // - bufferCommands: false (deprecated)
      // - bufferMaxEntries: 0 (deprecated)
      // - useNewUrlParser: true (deprecated)
      // - useUnifiedTopology: true (deprecated)

      serverApi: { version: "1", strict: true, deprecationErrors: true },
    });

    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ MongoDB connected with optimized settings");

    // 🔥 Connection monitoring
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected - attempting reconnect");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
