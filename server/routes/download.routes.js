const express = require("express");
const router = express.Router();

const { downloadDailyReport, downloadWeeklyReport } = require("../controllers/download.controller");
const authMiddleware = require("../middleware/Auth.middleware");

// ✅ Download Daily Report
router.get("/daily",authMiddleware, downloadDailyReport);

router.get("/weekly",authMiddleware, downloadWeeklyReport);

module.exports = router;