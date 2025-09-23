const express = require("express");
const router = express.Router();

const { downloadDailyReport } = require("../controllers/download.controller");
const authMiddleware = require("../middleware/Auth.middleware");

// ✅ Download Daily Report
router.get("/daily",authMiddleware, downloadDailyReport);

module.exports = router;