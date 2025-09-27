const express = require("express");
const router = express.Router();
const auth = require("../middleware/Auth.middleware");
const attendanceController = require("../controllers/Attendance.controller");
const qrRateLimiter = require("../middleware/qrRateLimiter.middleware");
const { downloadDailyReport, downloadWeeklyReport } = require("../controllers/download.controller");
const antiSpoofingMiddleware = require("../middleware/DIstance.middleware");
const cache = require("../middleware/cache.middleware");

// Core attendance functionality
router.post("/scan", auth, qrRateLimiter, antiSpoofingMiddleware, attendanceController.scanQRCode);

// User attendance history (limited to 1 month)
router.get("/past", auth, cache(60), attendanceController.getUserPastAttendance);

// Reports for users
router.get("/daily-report", auth, cache(120), attendanceController.getDailyReport);
router.get("/weekly-report", auth, cache(300), attendanceController.getWeeklyReport);
router.get("/monthly-report", auth, cache(600), attendanceController.getMonthlyReport);

// Download reports
router.get("/download-daily", auth, cache(60), downloadDailyReport);
router.get("/download-weekly", auth, cache(300), downloadWeeklyReport);

// Utility
router.get("/check", cache(600), attendanceController.checkWorkingDay);

module.exports = router;
