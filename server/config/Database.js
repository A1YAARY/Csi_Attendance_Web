// server/connectDB.js
const mongoose = require("mongoose");
require("dotenv").config();

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://aryanmadkar70_db_user:aryan@cluster0.oxxw1kn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function connectDB() {
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

  mongoose.connection.on("connected", () => {
    console.log("📡 MongoDB connection established");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("📡 MongoDB disconnected");
  });
}

module.exports = { connectDB };
