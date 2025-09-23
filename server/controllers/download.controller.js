const XLSX = require("xlsx");
const DailyTimeSheet = require("../models/DailyTimeSheet.models");
const User = require("../models/user.models");

// Helper to format minutes into hh:mm
const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

// ✅ Download Daily Report
const downloadDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const orgId = req.user.organizationId;
    const reportDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth(),
      reportDate.getDate()
    );

    const dailyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: startOfDay,
    }).populate("userId", "name email institute department");

    const allUsers = await User.find({ organizationId: orgId, role: "user" });

    const reportData = allUsers.map((user) => {
      const report = dailyReports.find(
        (r) => r.userId._id.toString() === user._id.toString()
      );
      return {
        Name: user.name,
        Email: user.email,
        Institute: user.institute,
        Department: user.department,
        TotalTime: report ? formatDuration(report.totalWorkingTime) : "0h 0m",
        Status: report ? report.status : "absent",
        Sessions: report ? report.sessions.length : 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    ws['!cols'] = Object.keys(reportData[0]).map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    const filename = `daily_report_${startOfDay.toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading daily report:", error);
    res.status(500).json({ success: false, message: "Failed to download daily report" });
  }
};

module.exports = {
  downloadDailyReport
};