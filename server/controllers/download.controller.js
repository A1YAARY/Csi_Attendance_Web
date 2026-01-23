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

// ✅ Download Weekly Report
const downloadWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId;
    const start = startDate ? new Date(startDate) : new Date();

    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weeklyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: start, $lte: end },
    }).populate("userId", "name email institute department");

    const allUsers = await User.find({ organizationId: orgId, role: "user" });

    const reportData = allUsers.map((user) => {
      const userReports = weeklyReports.filter(
        (r) => r.userId._id.toString() === user._id.toString()
      );
      const totalMinutes = userReports.reduce((acc, r) => acc + r.totalWorkingTime, 0);

      return {
        Name: user.name,
        Email: user.email,
        Institute: user.institute,
        Department: user.department,
        TotalTime: formatDuration(totalMinutes),
        FullDays: userReports.filter(r => r.status === "full-day").length,
        HalfDays: userReports.filter(r => r.status === "half-day").length,
        AbsentDays: userReports.filter(r => r.status === "absent").length,
        PresentDays: userReports.filter(r => r.status !== "absent").length,
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    ws['!cols'] = Object.keys(reportData[0]).map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    const filename = `weekly_report_${start.toISOString().split("T")[0]}_to_${end.toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading weekly report:", error);
    res.status(500).json({ success: false, message: "Failed to download weekly report" });
  }
};
module.exports = {
  downloadDailyReport,
  downloadWeeklyReport

};