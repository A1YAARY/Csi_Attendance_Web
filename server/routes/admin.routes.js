const express = require("express");
const router = express.Router();
const role = require("../middleware/role.middleware");
const adminController = require("../controllers/admin.controller");
const attendanceController = require("../controllers/Attendance.controller");
const auth = require("../middleware/Auth.middleware");
const cache = require("../middleware/cache.middleware");

// Core admin routes
router.get("/records", auth, role(["organization"]), cache(60), adminController.records);
router.get("/allusers", auth, role(["organization"]), cache(60), adminController.getusers);
router.get("/dashboard", auth, role(["organization"]), cache(30), adminController.getDashboardData);

// User management
router.get("/singleUser/:id", auth, role(["organization"]), cache(30), adminController.singleUser);
router.patch("/user/:id", auth, role(["organization"]), adminController.updateUserByAdmin);
router.delete("/user/:id", auth, role(["organization"]), adminController.deleteUser);

// Device management
router.post("/reset-user-device", auth, role(["organization"]), adminController.resetUserDevice);
router.get("/device-change-requests", auth, role(["organization"]), adminController.getDeviceChangeRequests);
router.post("/handle-device-change-request", auth, role(["organization"]), adminController.handleDeviceChangeRequest);

// Admin notifications
router.get("/notifications", auth, role(["organization"]), adminController.getNotifications);
router.patch("/notifications/:notificationId/read", auth, role(["organization"]), adminController.markNotificationRead);
router.patch("/notifications/read-all", auth, role(["organization"]), adminController.markAllNotificationsRead);



// QR Code management
router.get("/qrcodes", auth, role(["organization"]), cache(300), adminController.getOrganizationQRCodes);
router.get("/qrcode/:type", auth, role(["organization"]), cache(300), adminController.getQRCodeByType);

// Attendance and reports
router.get("/todays-attendance", auth, role(["organization"]), cache(30), adminController.getTodaysAttendance);
router.get("/daily-report", auth, role(["organization"]), cache(60), attendanceController.getDailyReport);
router.get("/weekly-report", auth, role(["organization"]), cache(300), attendanceController.getWeeklyReport);
router.get("/monthly-report", auth, role(["organization"]), cache(600), attendanceController.getMonthlyReport);

// Holiday management
router.post("/mark-holiday-attendance", auth, role(["organization"]), adminController.markHolidayAttendance);

module.exports = router;
