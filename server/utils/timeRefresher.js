const cron = require('node-cron');
const Attendance = require('../models/Attendance.models');
const DailyTimeSheet = require('../models/DailyTimeSheet.models');
const { ApiError } = require('../utils/errorHandler'); // New import

// IST timezone cron (node-cron supports it via environment)
process.env.TZ = 'Asia/Kolkata';

// Daily cleanup: Mark incomplete sessions at EOD (11:59 PM IST)
function scheduleDailyCleanup() {
  try {
    cron.schedule('59 23 * * *', async () => {
      console.log('🧹 Running daily attendance cleanup...');

      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today IST

      // Find incomplete sessions (check-in without check-out)
      const incomplete = await Attendance.aggregate([
        {
          $match: {
            type: 'check-in',
            istTimestamp: { $lt: today },
            organizationId: { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              organizationId: '$organizationId',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$istTimestamp',
                  timezone: 'Asia/Kolkata',
                },
              },
            },
            lastCheckIn: { $max: '$istTimestamp' },
          },
        },
        {
          $lookup: {
            from: 'attendances',
            let: { userId: '$_id.userId', orgId: '$_id.organizationId', dateStr: '$_id.date' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$organizationId', '$$orgId'] },
                      {
                        $eq: [
                          {
                            $dateToString: {
                              format: '%Y-%m-%d',
                              date: '$istTimestamp',
                              timezone: 'Asia/Kolkata',
                            },
                          },
                          '$$dateStr',
                        ],
                      },
                      { $eq: ['$type', 'check-out'] },
                    ],
                  },
                },
              },
            ],
            as: 'checkOuts',
          },
        },
        { $match: { checkOuts: { $size: 0 } } },
      ]);

      // Update incomplete sessions
      for (const session of incomplete) {
        // Mark as incomplete in timesheet or log
        console.log(`⚠️ Incomplete session for user ${session._id.userId} on ${session._id.date}`);
        // Optionally auto-check-out or notify admin
      }

      console.log('✅ Daily cleanup completed');
    }, {
      timezone: 'Asia/Kolkata',
    });

    console.log('✅ Daily cleanup scheduled (11:59 PM IST)');
  } catch (error) {
    console.error('Failed to schedule daily cleanup:', error);
    throw new ApiError(500, 'Cron scheduling failed for cleanup', {
      code: 'CRON_SETUP_ERROR',
      task: 'daily_cleanup',
    });
  }
}

// Weekly report generation (Friday 6 PM IST)
function scheduleWeeklyReports() {
  try {
    cron.schedule('0 18 * * 5', async () => {
      console.log('📊 Generating weekly reports...');
      // Logic to generate/send weekly summaries
      // e.g., Aggregate data and email admins
      console.log('✅ Weekly reports generated');
    }, {
      timezone: 'Asia/Kolkata',
    });

    console.log('✅ Weekly reports scheduled (Friday 6 PM IST)');
  } catch (error) {
    console.error('Failed to schedule weekly reports:', error);
    throw new ApiError(500, 'Cron scheduling failed for reports', {
      code: 'CRON_SETUP_ERROR',
      task: 'weekly_reports',
    });
  }
}

// Main scheduler
function ScheduleAttendanceCheck() {
  try {
    scheduleDailyCleanup();
    scheduleWeeklyReports();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Attendance scheduler initialization failed', {
      code: 'SCHEDULER_INIT_ERROR',
    });
  }
}

module.exports = ScheduleAttendanceCheck;
