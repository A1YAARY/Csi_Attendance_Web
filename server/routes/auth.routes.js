const express = require("express");
const router = express.Router();
const validate = require('../middleware/validate');
const { registerUser, loginUser, updateUser } = require('../validations/user.validation');
// 🚨 CRITICAL: Import verifyToken (was missing!)
const {
  register_orginization,
  register_user,
  login,
  logout,
  updateProfile,
  viewProfile,
  refreshToken,
  verifyToken,
  requestDeviceChange,
  getUserDeviceRequestStatus,
  getUserNotifications,
} = require("../controllers/auth2.controller");

const authMiddleware = require("../middleware/Auth.middleware");
const role = require("../middleware/role.middleware");

// Organization register
router.post("/organization-register", validate(registerUser),
  register_orginization);

// New user register
router.post("/register-user", validate(loginUser),
  register_user);

// Token refresh
router.post("/refresh-token", refreshToken);

// 🆕 NEW: Token verification endpoint
router.post("/verify-token", verifyToken);

// Login
router.post("/login", login);

// Logout (protected route)
router.post("/logout", authMiddleware, logout);

// Update profile (protected route)
router.put(
  "/updateProfile",
  authMiddleware,
  validate(updateUser),
  role(["organization"]),
  updateProfile
);

// Device change request (for users)
router.post("/device-change-request", requestDeviceChange);

// Get device request status (for users)
router.get("/device-request-status", authMiddleware, role(["user"]), getUserDeviceRequestStatus);

// Get user notifications (for users)
router.get("/notifications", authMiddleware, role(["user"]), getUserNotifications);


// View profile (protected route)
router.get("/viewProfile", authMiddleware, viewProfile);

module.exports = router;
