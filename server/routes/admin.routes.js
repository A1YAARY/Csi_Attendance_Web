const express = require("express");
const router = express.Router();
const role = require("../middleware/role.middleware");
const adminController = require("../controllers/admin.controller");
const attendanceController = require("../controllers/Attendance.controller");
const auth = require("../middleware/Auth.middleware");
const cache = require("../middleware/cache.middleware");

// Existing routes
router.get("/records", auth, role(["organization"]), adminController.records);
router.get("/allusers",auth,role(["organization"]),adminController.getusers)
router.get(
  "/singleUser/:id",
  auth,
  role(["organization"]),
  adminController.singleUser
);
router.get(
  "/qrcodes",
  auth,
  role(["organization"]),
  adminController.getOrganizationQRCodes
);
router.get(
  "/todays-attendance",
  auth,
  role(["organization"]),
  adminController.getTodaysAttendance
);
router.delete(
  "/user/:id",
  auth,
  role(["organization"]),
  adminController.deleteUser
);

// 🔥 ENHANCED QR CODE ROUTES
// Get both check-in and check-out QR codes
router.get(
  "/qrcodes",
  auth,
  role(["organization"]),
  cache(300), // Cache for 5 minutes
  adminController.getOrganizationQRCodes
);

// Get specific QR code by type
router.get(
  "/qrcode/:type",
  auth,
  role(["organization"]),
  cache(300),
  adminController.getQRCodeByType
);

// 🔥 NEW: Report routes
router.get(
  "/daily-report",
  auth,
  cache(60),
  role(["organization"]),
  attendanceController.getDailyReport
);

router.get(
  "/weekly-report",
  auth,
  cache(60),
  role(["organization"]),
  attendanceController.getWeeklyReport
);

module.exports = router;
