const cron = require("node-cron");
const User = require("../models/user.models");
const Attendance = require("../models/Attendance.models");
const DailyTimeSheet = require("../models/DailyTimeSheet.models");

const ScheduleAttendanceCheck = () => {
  // Reset user activity daily at midnight IST
  cron.schedule("30 18 * * *", async () => {
    // 12:00 AM IST = 6:30 PM UTC
    try {
      console.log("🔄 Running daily reset job...");
      const users = await User.find({ role: "user" });

      const updatePromises = users.map((user) => {
        user.lastActivity = false;
        return user.save();
      });

      await Promise.all(updatePromises);
      console.log("✅ Daily reset completed");
    } catch (error) {
      console.error("❌ Error in daily reset:", error);
    }
  });

  // Delete old attendance records (6 months old)
  cron.schedule("0 2 * * 0", async () => {
    // Every Sunday at 2 AM IST
    try {
      console.log("🗑️ Running cleanup job...");
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Delete old attendance records
      const attendanceResult = await Attendance.deleteMany({
        createdAt: { $lt: sixMonthsAgo },
      });

      // Delete old timesheet records
      const timesheetResult = await DailyTimeSheet.deleteMany({
        date: { $lt: sixMonthsAgo },
      });

      console.log(`✅ Cleanup completed:
        - Deleted ${attendanceResult.deletedCount} attendance records
        - Deleted ${timesheetResult.deletedCount} timesheet records`);
    } catch (error) {
      console.error("❌ Error in cleanup job:", error);
    }
  });

  console.log("⏰ Cron jobs scheduled successfully");
};

module.exports = ScheduleAttendanceCheck;
