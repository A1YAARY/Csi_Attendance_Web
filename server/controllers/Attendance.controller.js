// controllers/Attendance.controller.js

const Attendance = require('../models/Attendance.models');
const DailyTimeSheet = require('../models/DailyTimeSheet.models');
const QRCode = require('../models/Qrcode.models');
const Organization = require('../models/organization.models');
const User = require('../models/user.models');
const holidayService = require('../utils/holidayService');
const geolib = require('geolib');
const istUtils = require('../utils/istDateTimeUtils');

// QR scan (check-in / check-out)
const scanQRCode = async (req, res) => {
  try {
    const { qrCode, latitude, longitude, accuracy = 10 } = req.body;
    const userId = req.user._id;

    if (!qrCode || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'QR code and location are required' });
    }

    const qrCodeDoc = await QRCode.findOne({ code: qrCode }).populate('organizationId');
    if (!qrCodeDoc) {
      return res.status(400).json({ success: false, message: 'Invalid QR code' });
    }

    const userOrgId = (req.user.organizationId?._id || req.user.organizationId)?.toString();
    const qrOrgId = qrCodeDoc.organizationId._id.toString();
    if (userOrgId !== qrOrgId) {
      return res.status(403).json({ success: false, message: 'QR code not from your organization' });
    }

    const distance = geolib.getDistance(
      { latitude, longitude },
      { latitude: qrCodeDoc.location.latitude, longitude: qrCodeDoc.location.longitude }
    );
    const withinRange = distance <= qrCodeDoc.location.radius;

    if (!withinRange) {
      return res.status(400).json({
        success: false,
        message: `Must be within ${qrCodeDoc.location.radius}m`,
        code: 'LOCATION_OUT_OF_RANGE',
        data: {
          currentDistance: distance,
          allowedRadius: qrCodeDoc.location.radius,
        },
      });
    }

    // IST time window for today
    const nowIST = istUtils.getISTDate();
    const startIST = istUtils.getStartOfDayIST(nowIST);
    const endIST = istUtils.getEndOfDayIST(nowIST);

    // Throttle same-type scans within 5 minutes
    const recentScan = await Attendance.findOne({
      userId,
      type: qrCodeDoc.qrType,
      istTimestamp: { $gte: new Date(nowIST.getTime() - 5 * 60 * 1000) },
    });
    if (recentScan) {
      return res.status(400).json({
        success: false,
        message: 'Already scanned recently, please wait 5 minutes',
      });
    }

    // Find/create DTS
    let dts = await DailyTimeSheet.findOne({
      userId,
      organizationId: qrCodeDoc.organizationId._id,
      date: { $gte: startIST, $lte: endIST },
    });
    if (!dts) {
      dts = new DailyTimeSheet({
        userId,
        organizationId: qrCodeDoc.organizationId._id,
        date: startIST,
        sessions: [],
        totalWorkingTime: 0,
        status: 'absent',
      });
    }

    // Validate session logic
    if (qrCodeDoc.qrType === 'check-out') {
      const hasActive = dts.sessions.some(s => s.checkIn?.time && !s.checkOut?.time);
      if (!hasActive) {
        return res.status(400).json({
          success: false,
          message: 'No active check-in session found for check-out. Please check-in first.',
        });
      }
    }

    // Persist attendance
    const attendance = new Attendance({
      userId,
      organizationId: qrCodeDoc.organizationId._id,
      qrCodeId: qrCodeDoc._id,
      type: qrCodeDoc.qrType,
      istTimestamp: nowIST,
      location: { latitude, longitude, accuracy },
      deviceInfo: {
        deviceId:
          req.user.deviceInfo?.deviceId ||
          req.body.deviceInfo?.deviceId ||
          req.headers['x-device-id'],
        platform: req.headers['user-agent'],
        ipAddress: req.ip,
      },
      verified: true,
    });
    await attendance.save();

    // Update DTS sessions
    if (qrCodeDoc.qrType === 'check-in') {
      dts.addCheckInSession({ time: nowIST, attendanceId: attendance._id });
    } else {
      dts.addCheckOutToActiveSession({ time: nowIST, attendanceId: attendance._id });
    }

    // Recompute totals
    dts.updateTotalWorkingTime();
    await dts.save();

    // Metrics
    qrCodeDoc.usageCount = (qrCodeDoc.usageCount || 0) + 1;
    await qrCodeDoc.save();

    const formattedTime = istUtils.formatISTTimestamp(attendance.istTimestamp);

    return res.json({
      success: true,
      message: `${qrCodeDoc.qrType} successful`,
      data: {
        type: qrCodeDoc.qrType,
        timestamp: attendance.istTimestamp,
        timestampIST: formattedTime,
        location: {
          latitude,
          longitude,
          accuracy,
          distance,       // meters (number)
          withinRange,    // boolean
        },
        organizationName: qrCodeDoc.organizationId.name,
        sessionNumber: dts.sessions.length,
        totalWorkingTime: dts.totalWorkingTime,
        totalWorkingHours: istUtils.formatDuration(dts.totalWorkingTime),
        status: dts.status,
        serverTimeIST: istUtils.formatISTTimestamp(nowIST),
        timezone: 'Asia/Kolkata (IST)',
        hasActiveSession: dts.hasActiveSession,
      },
    });
  } catch (err) {
    console.error('scanQRCode error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process attendance' });
  }
};

// Past attendance for current user
const getUserPastAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    // FIX: Use IST-aware date calculation
    const nowIST = istUtils.getISTDate();
    const oneMonthAgo = new Date(nowIST);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const fromIST = istUtils.getStartOfDayIST(oneMonthAgo);

    console.log('Past attendance query:', {
      userId,
      fromIST: fromIST.toISOString(),
      nowIST: nowIST.toISOString()
    });

    // FIX: Simplified query - get all records with sessions or non-absent status
    const baseQuery = {
      userId,
      date: { $gte: fromIST },
      // Remove complex $or condition - let's get all records first
    };

    const [total, sheets] = await Promise.all([
      DailyTimeSheet.countDocuments(baseQuery),
      DailyTimeSheet.find(baseQuery)
        .populate('organizationId', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    console.log('Found sheets:', sheets.length, 'Total:', total);

    const attendance = sheets.map((s) => {
      const sessions = (s.sessions || []).map((sess, i) => {
        // FIX: Simplified session data extraction
        const checkInTime = sess.checkIn?.time;
        const checkOutTime = sess.checkOut?.time;
        const duration = sess.duration || 0;

        return {
          sessionNumber: i + 1,
          checkIn: checkInTime ? {
            time: checkInTime,
            timeIST: istUtils.formatISTTimestamp(checkInTime)
          } : null,
          checkOut: checkOutTime ? {
            time: checkOutTime,
            timeIST: istUtils.formatISTTimestamp(checkOutTime)
          } : null,
          duration,
          durationFormatted: istUtils.formatDuration(duration),
          isActive: Boolean(checkInTime && !checkOutTime),
        };
      });

      const totalWorkingTime = s.totalWorkingTime || 0;

      return {
        _id: s._id,
        date: s.date,
        dateIST: istUtils.formatISTTimestamp(s.date),
        status: s.status || 'absent',
        totalWorkingTime,
        totalWorkingTimeFormatted: istUtils.formatDuration(totalWorkingTime),
        sessionsCount: sessions.length,
        sessions,
        organizationName: s.organizationId?.name || 'Unknown',
        hasActiveSession: sessions.some(x => x.isActive),
      };
    });

    // FIX: Filter out truly empty records after processing
    const filteredAttendance = attendance.filter(record =>
      record.sessionsCount > 0 || record.status !== 'absent'
    );

    console.log('Filtered attendance records:', filteredAttendance.length);

    res.json({
      success: true,
      page,
      limit,
      skip,
      total: filteredAttendance.length, // Use filtered count
      totalPages: Math.ceil(filteredAttendance.length / limit),
      data: filteredAttendance,
      debug: {
        queryRange: {
          from: fromIST.toISOString(),
          to: nowIST.toISOString(),
        },
        rawSheetsFound: sheets.length,
        filteredCount: filteredAttendance.length,
      }
    });

  } catch (err) {
    console.error('getUserPastAttendance error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load attendance',
      error: err?.message || String(err),
    });
  }
};


const getTodaysAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    // Use the IST-aware utility to get the date range
    const nowIST = istUtils.getISTDate();
    const startOfDay = istUtils.getStartOfDayIST(nowIST);
    const endOfDay = istUtils.getEndOfDayIST(nowIST);

    const todaysSheet = await DailyTimeSheet.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate('organizationId', 'name');

    if (!todaysSheet) {
      return res.status(200).json({
        success: true,
        message: 'No attendance record for today.',
        data: null,
      });
    }

    // *** ADD THIS LOGIC TO FORMAT THE DATA ***
    const formattedSheet = {
      id: todaysSheet._id,
      date: todaysSheet.date,
      status: todaysSheet.status,
      totalWorkingTime: todaysSheet.totalWorkingTime || 0,
      totalWorkingTimeFormatted: istUtils.formatDuration(todaysSheet.totalWorkingTime || 0),
      sessions: todaysSheet.sessions.map((sess, i) => ({
        sessionNumber: i + 1,
        checkIn: sess.checkIn ? {
          time: sess.checkIn.time,
          timeIST: istUtils.formatISTTimestamp(sess.checkIn.time, 'h:mm A'),
        } : null,
        checkOut: sess.checkOut ? {
          time: sess.checkOut.time,
          timeIST: istUtils.formatISTTimestamp(sess.checkOut.time, 'h:mm A'),
        } : null,
        duration: sess.duration || 0,
        durationFormatted: istUtils.formatDuration(sess.duration || 0),
        isActive: !!sess.checkIn && !sess.checkOut,
      })),
      organizationName: todaysSheet.organizationId ? todaysSheet.organizationId.name : 'N/A',
      hasActiveSession: todaysSheet.sessions.some(s => !!s.checkIn && !s.checkOut),
    };

    res.status(200).json({ success: true, data: formattedSheet });

  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ success: false, message: "Failed to fetch today's attendance" });
  }
};

// Daily report (no nulls in first/last; uses "-" if missing)
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const orgId = req.user.organizationId;

    const reportDate = date ? istUtils.getISTDate(new Date(date)) : istUtils.getISTDate();
    const startOfDay = istUtils.getStartOfDayIST(reportDate);
    const endOfDay = istUtils.getEndOfDayIST(reportDate);

    const isHoliday = !(await holidayService.isWorkingDay(reportDate));

    const dailyTimesheets = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('userId', 'name email department institute')
      .sort({ 'userId.name': 1 })
      .lean();

    const allUsers = await User.find({ organizationId: orgId, role: 'user' })
      .select('name email department institute')
      .lean();

    const report = allUsers.map(user => {
      const timesheet = dailyTimesheets.find(
        sheet => sheet.userId._id.toString() === user._id.toString()
      );

      let status = 'absent';
      let workingTime = 0;
      let sessions = [];
      let firstCheckIn = '-';
      let lastCheckOut = '-';

      if (isHoliday) {
        status = 'holiday';
      } else if (timesheet) {
        status = timesheet.status;
        workingTime = timesheet.totalWorkingTime || 0;
        sessions = timesheet.sessions || [];

        if (sessions.length > 0) {
          const checkIns = sessions.filter(s => s.checkIn?.time).map(s => new Date(s.checkIn.time));
          const checkOuts = sessions.filter(s => s.checkOut?.time).map(s => new Date(s.checkOut.time));

          if (checkIns.length > 0) {
            const first = new Date(Math.min(...checkIns.map(d => d.getTime())));
            firstCheckIn = istUtils.formatISTTimestamp(first).readable;
          }
          if (checkOuts.length > 0) {
            const last = new Date(Math.max(...checkOuts.map(d => d.getTime())));
            lastCheckOut = istUtils.formatISTTimestamp(last).readable;
          }
        }
      }

      return {
        employeeId: user._id,
        name: user.name,
        email: user.email,
        department: user.department || 'General',
        institute: user.institute || '',
        date: reportDate.toISOString().split('T')[0],
        dateIST: istUtils.formatISTTimestamp(reportDate).readable,
        status,
        workingTime,
        workingHours: istUtils.formatDuration(workingTime),
        sessionsCount: sessions.length,
        firstCheckIn,
        lastCheckOut,
        isHoliday,
      };
    });

    const stats = {
      totalEmployees: allUsers.length,
      present: report.filter(r => !['absent', 'holiday'].includes(r.status)).length,
      absent: report.filter(r => r.status === 'absent').length,
      holiday: isHoliday,
      fullDays: report.filter(r => r.status === 'full-day').length,
      halfDays: report.filter(r => r.status === 'half-day').length,
      averageWorkingHours:
        allUsers.length > 0
          ? (report.reduce((sum, r) => sum + r.workingTime, 0) / allUsers.length / 60).toFixed(2)
          : '0.00',
    };

    res.json({
      success: true,
      reportDate: reportDate.toISOString().split('T')[0],
      reportDateIST: istUtils.formatISTTimestamp(reportDate).readable,
      isHoliday,
      stats,
      data: report,
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
    });
  }
};

// Weekly report (IST week window)
const getWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId;

    let weekStart = startDate ? istUtils.getStartOfDayIST(new Date(startDate)) : null;
    if (!weekStart) {
      const today = istUtils.getISTDate();
      const dow = today.getDay(); // 0=Sun
      const tmp = new Date(today);
      tmp.setDate(today.getDate() - dow);
      weekStart = istUtils.getStartOfDayIST(tmp);
    }
    let weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd = istUtils.getEndOfDayIST(weekEnd);

    const weeklyTimesheets = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: weekStart, $lte: weekEnd },
    })
      .populate('userId', 'name email department institute')
      .lean();

    const allUsers = await User.find({ organizationId: orgId, role: 'user' }).lean();

    const weeklyReport = allUsers.map(user => {
      const userTimesheets = weeklyTimesheets.filter(
        sheet => sheet.userId._id.toString() === user._id.toString()
      );

      const totalWorkingTime = userTimesheets.reduce((sum, sheet) => sum + (sheet.totalWorkingTime || 0), 0);
      const presentDays = userTimesheets.filter(sheet => sheet.status !== 'absent').length;
      const fullDays = userTimesheets.filter(sheet => sheet.status === 'full-day').length;
      const halfDays = userTimesheets.filter(sheet => sheet.status === 'half-day').length;

      return {
        employeeId: user._id,
        name: user.name,
        email: user.email,
        department: user.department || 'General',
        institute: user.institute || '',
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        presentDays,
        absentDays: 7 - presentDays,
        fullDays,
        halfDays,
        totalWorkingTime,
        totalWorkingHours: istUtils.formatDuration(totalWorkingTime),
        averageDailyHours: presentDays > 0 ? (totalWorkingTime / presentDays / 60).toFixed(2) : '0.00',
        totalSessions: userTimesheets.reduce((sum, sheet) => sum + (sheet.sessions?.length || 0), 0),
      };
    });

    const stats = {
      totalEmployees: allUsers.length,
      weekStartDate: weekStart.toISOString().split('T')[0],
      weekEndDate: weekEnd.toISOString().split('T')[0],
      totalPresentDays: weeklyReport.reduce((sum, u) => sum + u.presentDays, 0),
      totalAbsentDays: weeklyReport.reduce((sum, u) => sum + u.absentDays, 0),
      totalWorkingHours: weeklyReport.reduce((sum, u) => sum + u.totalWorkingTime, 0) / 60,
      averageAttendance:
        allUsers.length > 0
          ? ((weeklyReport.reduce((s, u) => s + u.presentDays, 0) / (allUsers.length * 7)) * 100).toFixed(2)
          : '0.00',
    };

    res.json({
      success: true,
      period: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        startIST: istUtils.formatISTTimestamp(weekStart).readable,
        endIST: istUtils.formatISTTimestamp(weekEnd).readable,
      },
      stats,
      data: weeklyReport,
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly report',
    });
  }
};

// Monthly report (IST month window)
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const orgId = req.user.organizationId;

    const now = istUtils.getISTDate();
    const reportYear = year ? parseInt(year) : now.getFullYear();
    const reportMonth = month ? parseInt(month) - 1 : now.getMonth();

    const startOfMonth = istUtils.getStartOfDayIST(new Date(reportYear, reportMonth, 1));
    const endOfMonth = istUtils.getEndOfDayIST(new Date(reportYear, reportMonth + 1, 0));

    const monthlyReports = await DailyTimeSheet.find({
      organizationId: orgId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).populate('userId', 'name email institute department').lean();

    const allUsers = await User.find({ organizationId: orgId, role: 'user' }).lean();

    const userSummary = {};
    const monthDays = endOfMonth.getUTCDate();

    allUsers.forEach((user) => {
      userSummary[user._id.toString()] = {
        userId: user._id,
        name: user.name,
        email: user.email,
        institute: user.institute,
        department: user.department,
        dailyRecords: {},
        totalMinutes: 0,
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        fullDays: 0,
        lateEntries: 0,
        earlyDepartures: 0,
        totalSessions: 0,
        averageWorkingHours: 0,
      };

      for (let day = 1; day <= monthDays; day++) {
        const dateKey = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        userSummary[user._id.toString()].dailyRecords[dateKey] = {
          date: dateKey,
          status: 'absent',
          workingTime: 0,
          sessions: 0,
          firstCheckIn: '-',
          lastCheckOut: '-',
        };
      }
    });

    monthlyReports.forEach((report) => {
      const userId = report.userId._id.toString();
      const dateKey = new Date(report.date).toISOString().split('T')[0];

      if (userSummary[userId] && userSummary[userId].dailyRecords[dateKey]) {
        const dayRecord = {
          date: dateKey,
          status: report.status,
          workingTime: report.totalWorkingTime,
          sessions: report.sessions.length,
          firstCheckIn: '-',
          lastCheckOut: '-',
        };

        if (report.sessions && report.sessions.length > 0) {
          const checkIns = report.sessions.filter(s => s.checkIn?.time).map(s => new Date(s.checkIn.time));
          const checkOuts = report.sessions.filter(s => s.checkOut?.time).map(s => new Date(s.checkOut.time));

          if (checkIns.length > 0) {
            const first = new Date(Math.min(...checkIns.map(d => d.getTime())));
            dayRecord.firstCheckIn = istUtils.formatISTTimestamp(first).readable;
          }
          if (checkOuts.length > 0) {
            const last = new Date(Math.max(...checkOuts.map(d => d.getTime())));
            dayRecord.lastCheckOut = istUtils.formatISTTimestamp(last).readable;
          }
        }

        userSummary[userId].dailyRecords[dateKey] = dayRecord;
        userSummary[userId].totalMinutes += report.totalWorkingTime || 0;
        userSummary[userId].totalSessions += report.sessions.length;

        if (report.status === 'full-day') {
          userSummary[userId].fullDays++;
          userSummary[userId].presentDays++;
        } else if (report.status === 'half-day') {
          userSummary[userId].halfDays++;
          userSummary[userId].presentDays++;
        } else if (report.status !== 'absent') {
          userSummary[userId].presentDays++;
        }

        // Placeholder for policy checks (late/early) if needed
      }
    });

    Object.keys(userSummary).forEach((uid) => {
      const u = userSummary[uid];
      u.absentDays = monthDays - u.presentDays;
      u.averageWorkingHours = u.presentDays > 0 ? (u.totalMinutes / u.presentDays / 60).toFixed(1) : '0.0';
    });

    res.json({
      success: true,
      month: reportMonth + 1,
      year: reportYear,
      monthName: new Date(reportYear, reportMonth).toLocaleString('en-US', { month: 'long' }),
      totalDays: monthDays,
      summary: userSummary,
      organizationStats: {
        totalEmployees: allUsers.length,
        totalWorkingDays: monthDays,
        averageAttendance:
          allUsers.length > 0
            ? (Object.values(userSummary).reduce((sum, u) => sum + u.presentDays, 0) / (allUsers.length * monthDays) * 100).toFixed(1)
            : '0.0',
      },
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly report',
    });
  }
};

// Working day check
const checkWorkingDay = async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = date ? istUtils.getISTDate(new Date(date)) : istUtils.getISTDate();

    const isWorking = await holidayService.isWorkingDay(checkDate);

    res.json({
      success: true,
      date: checkDate.toISOString().split('T')[0],
      dateIST: istUtils.formatISTTimestamp(checkDate).readable,
      isWorkingDay: isWorking,
      isHoliday: !isWorking,
      dayOfWeek: checkDate.toLocaleDateString('en-US', { weekday: 'long' }),
    });
  } catch (error) {
    console.error('Error checking working day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check working day',
    });
  }
};

module.exports = {
  scanQRCode,
  getUserPastAttendance,
  getDailyReport,
  getWeeklyReport,
  getTodaysAttendance,

  getMonthlyReport,
  checkWorkingDay,
};
