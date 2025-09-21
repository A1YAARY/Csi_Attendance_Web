const express = require("express");
const router = express.Router();
const {
  register_orginization,
  register_user,
  login,
  logout,
  updateProfile,
  viewProfile,
  refreshToken,
} = require("../controllers/auth2.controller");
const authMiddleware = require("../middleware/Auth.middleware");
const role = require("../middleware/role.middleware");

//User SignUp or Login
// router.post('/oauth/login', );

//For directing to the home page
// router.get('/home',userControllers.home);

//For scanning QR
// router.post('/scan_qr',);

//For directing to the dashboard
// router.get('/dashboard',authController.dashboard);

//For Viewing profile
// router.get('/view_profile',authController.viewprofile);

// organizationregister
router.post("/organization-register", register_orginization);

// new user register
router.post("/register-user", register_user);
router.post("/refresh-token", refreshToken); // 🆕 NEW ROUTE

// login
router.post("/login", login);

//For logging out
router.post("/logout",authMiddleware, logout);

//For updating profile
router.put(
  "/updateProfile",
  authMiddleware,
  role(["organization"]),
  updateProfile
);

//For viewprofile profile
router.get("/viewProfile", authMiddleware, viewProfile);

module.exports = router;
