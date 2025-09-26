const express = require("express");
const {
  requestPasswordReset,
  resetPassword,
} = require("../controllers/resetpassword.controller");
const authMiddleware = require("../middleware/Auth.middleware");
const { updatePassword } = require("../controllers/updatepass.controller");

const router = express.Router();

router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/update-password", authMiddleware,updatePassword)
module.exports = router;
