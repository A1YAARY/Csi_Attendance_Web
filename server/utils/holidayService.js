const axios = require('axios');
const { ApiError } = require('../utils/errorHandler'); // New import

// Cache for holidays to avoid repeated API calls
const holidayCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fetch holidays from API (e.g., Indian government holidays)
async function fetchHolidays(year) {
  try {
    const cacheKey = `holidays_${year}`;
    const cached = holidayCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    const response = await axios.get(
      `https://api.example.com/holidays/in/${year}`, // Replace with actual API endpoint
      { timeout: 5000 }
    );

    const holidays = response.data;
    holidayCache.set(cacheKey, { data: holidays, timestamp: now });
    return holidays;
  } catch (error) {
    console.error('Holiday API fetch error:', error.message);
    throw new ApiError(503, 'Failed to fetch holiday data', {
      code: 'HOLIDAY_API_ERROR',
      year: year,
    });
  }
}

// Check if a date is a working day (not weekend or holiday)
async function isWorkingDay(date = new Date()) {
  try {
    const year = date.getFullYear();
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    if (isWeekend) {
      return { isWorkingDay: false, reason: 'Weekend' };
    }

    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];

    // Fetch holidays for the year
    const holidays = await fetchHolidays(year);

    // Check if date is a holiday
    const isHoliday = holidays.some(holiday =>
      holiday.date === dateStr && holiday.country === 'IN'
    );

    if (isHoliday) {
      return { isWorkingDay: false, reason: 'Holiday', holidayName: holidays.find(h => h.date === dateStr)?.name };
    }

    return { isWorkingDay: true, reason: 'Working Day' };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error; // Re-throw ApiError
    }
    throw new ApiError(500, 'Error checking working day', {
      code: 'WORKING_DAY_CHECK_ERROR',
      date: date.toISOString().split('T')[0],
    });
  }
}

// Get holidays for a specific month/year
async function getMonthlyHolidays(year, month) {
  try {
    const holidays = await fetchHolidays(year);
    const monthHolidays = holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
    });

    return {
      year,
      month: month + 1, // 0-indexed to 1-indexed
      holidays: monthHolidays,
      totalHolidays: monthHolidays.length,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to fetch monthly holidays', {
      code: 'MONTHLY_HOLIDAYS_ERROR',
      year,
      month,
    });
  }
}

module.exports = {
  isWorkingDay,
  getMonthlyHolidays,
  fetchHolidays, // Internal use
};
