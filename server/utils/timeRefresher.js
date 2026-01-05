const cron = require('node-cron');
const User = require('../models/user.models');
const DailyTimeSheet = require('../models/DailyTimeSheet.models');
const istUtils = require('./istDateTimeUtils');

/**
 * Auto-mark weekly offs for all users
 * Runs daily at 12:00 AM IST
 */
const autoMarkWeeklyOffs = async () => {
  try {
    console.log('🕐 [CRON] Starting auto-mark weekly offs job...');

    const today = istUtils.getISTDate();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const startOfDay = istUtils.getStartOfDayIST(today);
    const endOfDay = istUtils.getEndOfDayIST(today);

    console.log(`📅 Processing date: ${today.toISOString().split('T')[0]} (${dayName})`);

    // Get all users
    const users = await User.find({ role: 'user' }).lean();
    console.log(`👥 Total users found: ${users.length}`);

    // Filter users who have this day as weekly off
    const usersWithWeeklyOff = users.filter(user => {
      const schedule = user.weeklySchedule || {};
      return schedule[dayName] === false; // false = not working = weekly off
    });

    console.log(`✅ Users with weekly off on ${dayName}: ${usersWithWeeklyOff.length}`);

    if (usersWithWeeklyOff.length === 0) {
      console.log('✨ No users with weekly off today');
      return;
    }

    // Create or update daily timesheets for weekly off
    const bulkOperations = usersWithWeeklyOff.map(user => ({
      updateOne: {
        filter: {
          userId: user._id,
          organizationId: user.organizationId,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        update: {
          $setOnInsert: {
            userId: user._id,
            organizationId: user.organizationId,
            date: startOfDay,
            sessions: [],
            totalWorkingTime: 0,
            status: 'weekly-off',
            isWeeklyOff: true,
          },
        },
        upsert: true,
      },
    }));

    const result = await DailyTimeSheet.bulkWrite(bulkOperations);

    console.log('📊 Weekly off marking completed:');
    console.log(`   - Inserted: ${result.upsertedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);
    console.log(`   - Total processed: ${usersWithWeeklyOff.length}`);
  } catch (error) {
    console.error('❌ [CRON] Error in auto-mark weekly offs:', error);
  }
};

/**
 * Auto-mark custom holidays
 */
const autoMarkCustomHolidays = async () => {
  try {
    console.log('🎉 [CRON] Starting auto-mark custom holidays job...');

    const today = istUtils.getISTDate();
    const dateKey = today.toISOString().split('T')[0];
    const startOfDay = istUtils.getStartOfDayIST(today);
    const endOfDay = istUtils.getEndOfDayIST(today);

    // Get all users with custom holidays
    const users = await User.find({
      role: 'user',
      customHolidays: { $exists: true, $ne: [] }
    }).lean();

    // Filter users who have today as custom holiday
    const usersWithHoliday = users.filter(user => {
      return (user.customHolidays || []).some(
        holiday => new Date(holiday).toISOString().split('T')[0] === dateKey
      );
    });

    console.log(`🎊 Users with custom holiday today: ${usersWithHoliday.length}`);

    if (usersWithHoliday.length === 0) {
      console.log('✨ No users with custom holiday today');
      return;
    }

    const bulkOperations = usersWithHoliday.map(user => ({
      updateOne: {
        filter: {
          userId: user._id,
          organizationId: user.organizationId,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        update: {
          $setOnInsert: {
            userId: user._id,
            organizationId: user.organizationId,
            date: startOfDay,
            sessions: [],
            totalWorkingTime: 0,
            status: 'custom-holiday',
            isCustomHoliday: true,
          },
        },
        upsert: true,
      },
    }));

    const result = await DailyTimeSheet.bulkWrite(bulkOperations);

    console.log('📊 Custom holiday marking completed:');
    console.log(`   - Inserted: ${result.upsertedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error('❌ [CRON] Error in auto-mark custom holidays:', error);
  }
};

/**
 * Main scheduler function
 * Called from server.js
 */
const ScheduleAttendanceCheck = () => {
  console.log('🚀 Initializing attendance cron jobs...');

  // **CRITICAL: Run at 12:00 AM (midnight) every day in IST**
  // Cron format: seconds minutes hours day month dayOfWeek
  // "0 0 * * *" = At 00:00 (midnight) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🌙 MIDNIGHT CRON JOB STARTED - ' + new Date().toISOString());
    console.log('='.repeat(60));

    await autoMarkWeeklyOffs();
    await autoMarkCustomHolidays();

    console.log('='.repeat(60));
    console.log('✅ MIDNIGHT CRON JOB COMPLETED');
    console.log('='.repeat(60) + '\n');
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // IST timezone
  });

  // **OPTIONAL: Run end-of-day check at 11:59 PM to mark absents**
  cron.schedule('59 23 * * *', async () => {
    console.log('🌃 Running end-of-day absence check...');
    await markAbsentUsers();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('✅ Cron jobs scheduled successfully:');
  console.log('   ⏰ Weekly offs check: Every day at 12:00 AM IST');
  console.log('   ⏰ Absence check: Every day at 11:59 PM IST');
};

/**
 * Mark users as absent if they haven't checked in by end of day
 */
const markAbsentUsers = async () => {
  try {
    console.log('📋 Marking absent users for today...');

    const today = istUtils.getISTDate();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const startOfDay = istUtils.getStartOfDayIST(today);
    const endOfDay = istUtils.getEndOfDayIST(today);
    const dateKey = today.toISOString().split('T')[0];

    // Get all users
    const users = await User.find({ role: 'user' }).lean();

    // Get existing timesheets for today
    const existingTimesheets = await DailyTimeSheet.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const usersWithTimesheet = new Set(
      existingTimesheets.map(ts => ts.userId.toString())
    );

    // Find users without timesheet today
    const absentUsers = users.filter(user => {
      // Skip if already has timesheet
      if (usersWithTimesheet.has(user._id.toString())) return false;

      // Skip if it's their weekly off
      const schedule = user.weeklySchedule || {};
      if (schedule[dayName] === false) return false;

      // Skip if it's their custom holiday
      const isCustomHoliday = (user.customHolidays || []).some(
        holiday => new Date(holiday).toISOString().split('T')[0] === dateKey
      );
      if (isCustomHoliday) return false;

      return true; // Mark as absent
    });

    console.log(`❌ Users to mark absent: ${absentUsers.length}`);

    if (absentUsers.length === 0) {
      console.log('✅ All users have marked attendance or are on leave');
      return;
    }

    // Create absent records
    const absentRecords = absentUsers.map(user => ({
      userId: user._id,
      organizationId: user.organizationId,
      date: startOfDay,
      sessions: [],
      totalWorkingTime: 0,
      status: 'absent',
    }));

    await DailyTimeSheet.insertMany(absentRecords);

    console.log(`✅ Marked ${absentRecords.length} users as absent`);
  } catch (error) {
    console.error('❌ Error marking absent users:', error);
  }
};

module.exports = ScheduleAttendanceCheck;
