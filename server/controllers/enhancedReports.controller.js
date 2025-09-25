// controllers/enhancedReports.controller.js
const DateTimeUtils = require("../utils/dateTimeUtils");
const { isWorkingDay } = require("../utils/holidayService");
const User = require("../models/user.models");
const Attendance = require("../models/Attendance.models");
const DailyTimeSheet = require("../models/DailyTimeSheet.models");

class EnhancedReportsController {
  async getComprehensiveDailyReport(req, res) {
    try {
      const { date } = req.query;
      const orgId = req.user.organizationId;

      const reportDate = date ? new Date(date) : new Date();
      const isHoliday = !(await isWorkingDay(reportDate));

      const startOfDay = DateTimeUtils.getStartOfDayIST(reportDate);
      const endOfDay = DateTimeUtils.getEndOfDayIST(reportDate);

      // Get all users in organization
      const users = await User.find({ organizationId: orgId, role: "user" });

      // Get attendance for the day
      const attendanceRecords = await Attendance.find({
        organizationId: orgId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).populate("userId", "name email department");

      // Get daily time sheets
      const dailySheets = await DailyTimeSheet.find({
        organizationId: orgId,
        date: startOfDay,
      }).populate("userId", "name email department");

      // Generate comprehensive report
      const report = users.map((user) => {
        const userAttendance = attendanceRecords.filter(
          (record) => record.userId._id.toString() === user._id.toString()
        );

        const dailySheet = dailySheets.find(
          (sheet) => sheet.userId._id.toString() === user._id.toString()
        );

        const checkInRecord = userAttendance.find((a) => a.type === "check-in");
        const checkOutRecord = userAttendance.find(
          (a) => a.type === "check-out"
        );

        let status = "absent";
        let workingHours = 0;
        let notes = [];

        if (isHoliday) {
          status = "holiday";
          notes.push("Public holiday - automatic present");
        } else if (checkInRecord && checkOutRecord) {
          const checkInTime = new Date(checkInRecord.createdAt);
          const checkOutTime = new Date(checkOutRecord.createdAt);
          workingHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // hours

          status =
            workingHours >= 8
              ? "full-day"
              : workingHours >= 4
              ? "half-day"
              : "present";
        } else if (checkInRecord) {
          status = "half-day";
          notes.push("Checked in but no check-out recorded");
        }

        return {
          employeeId: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          date: DateTimeUtils.formatIST(reportDate, { weekday: "long" }),
          status,
          workingHours: workingHours.toFixed(2),
          checkInTime: checkInRecord
            ? DateTimeUtils.formatIST(checkInRecord.createdAt, {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A",
          checkOutTime: checkOutRecord
            ? DateTimeUtils.formatIST(checkOutRecord.createdAt, {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A",
          location: checkInRecord?.location || "N/A",
          isHoliday,
          notes: notes.length > 0 ? notes : ["Normal attendance"],
        };
      });

      // Statistics
      const stats = {
        totalEmployees: users.length,
        present: report.filter((r) =>
          ["full-day", "half-day", "present"].includes(r.status)
        ).length,
        absent: report.filter((r) => r.status === "absent").length,
        holiday: isHoliday,
        averageWorkingHours: (
          report.reduce((sum, r) => sum + parseFloat(r.workingHours), 0) /
          users.length
        ).toFixed(2),
      };

      res.json({
        success: true,
        reportDate: DateTimeUtils.formatIST(reportDate),
        isHoliday,
        stats,
        data: report,
      });
    } catch (error) {
      console.error("Error generating daily report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate report",
      });
    }
  }

  async getMonthlyReport(req, res) {
    try {
      const { year, month } = req.query;
      const orgId = req.user.organizationId;

      const targetYear = parseInt(year) || new Date().getFullYear();
      const targetMonth = parseInt(month) || new Date().getMonth() + 1;

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0);

      const users = await User.find({ organizationId: orgId, role: "user" });
      const dailySheets = await DailyTimeSheet.find({
        organizationId: orgId,
        date: { $gte: startDate, $lte: endDate },
      }).populate("userId", "name email department");

      const monthlyReport = users.map((user) => {
        const userSheets = dailySheets.filter(
          (sheet) => sheet.userId._id.toString() === user._id.toString()
        );

        const workingDays = userSheets.filter(
          (sheet) => sheet.status !== "absent"
        ).length;
        const totalWorkingHours =
          userSheets.reduce((sum, sheet) => sum + sheet.totalWorkingTime, 0) /
          60; // hours
        const averageDailyHours =
          workingDays > 0 ? (totalWorkingHours / workingDays).toFixed(2) : 0;

        return {
          employeeId: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          month: `${targetYear}-${targetMonth.toString().padStart(2, "0")}`,
          workingDays,
          totalWorkingHours: totalWorkingHours.toFixed(2),
          averageDailyHours,
          fullDays: userSheets.filter((s) => s.status === "full-day").length,
          halfDays: userSheets.filter((s) => s.status === "half-day").length,
          absentDays: userSheets.filter((s) => s.status === "absent").length,
          salaryEligibility: this.calculateSalaryEligibility(
            workingDays,
            totalWorkingHours
          ),
        };
      });

      res.json({
        success: true,
        period: `${targetYear}-${targetMonth.toString().padStart(2, "0")}`,
        data: monthlyReport,
      });
    } catch (error) {
      console.error("Error generating monthly report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate monthly report",
      });
    }
  }

  calculateSalaryEligibility(workingDays, totalHours) {
    // Salary calculation logic for teachers
    const minWorkingDays = 20; // Minimum working days per month
    const minTotalHours = 160; // Minimum hours per month (8 hours × 20 days)

    if (workingDays >= minWorkingDays && totalHours >= minTotalHours) {
      return "full_salary";
    } else if (workingDays >= minWorkingDays * 0.75) {
      return "proportional_salary";
    } else {
      return "no_salary";
    }
  }
}

module.exports = new EnhancedReportsController();
