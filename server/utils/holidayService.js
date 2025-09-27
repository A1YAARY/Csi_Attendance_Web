const { google } = require("googleapis");
const path = require("path");

// Path to your service account JSON
const SERVICE_ACCOUNT_FILE = path.join("service-account.json");
const HOLIDAY_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";

// Authenticate using service account
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});

// Initialize Google Calendar API client
const calendar = google.calendar({ version: "v3", auth });

// Company-specific holidays (configurable)
const companyHolidays = [
  "2025-01-26", // Republic Day
  "2025-08-15", // Independence Day
  "2025-12-31", // New Year's Eve
];

// IST helper functions
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

// Check weekend
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

// Fetch holidays from Google Calendar
async function getGoogleHolidays(year) {
  try {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const response = await calendar.events.list({
      calendarId: HOLIDAY_CALENDAR_ID,
      timeMin: startOfYear.toISOString(),
      timeMax: endOfYear.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const holidays = response.data.items.map((event) => ({
      date: event.start.date,
      name: event.summary,
      type: "national",
    }));

    return holidays;
  } catch (error) {
    console.warn("Failed to fetch Google holidays:", error.message);
    return [];
  }
}

// Get all holidays for a year (Google + Company)
async function getAllHolidays(year) {
  try {
    const googleHolidays = await getGoogleHolidays(year);

    const companyHolidayObjects = companyHolidays
      .filter(date => new Date(date).getFullYear() === year)
      .map(date => ({
        date,
        name: "Company Holiday",
        type: "company",
      }));

    return [...googleHolidays, ...companyHolidayObjects];
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return companyHolidays
      .filter(date => new Date(date).getFullYear() === year)
      .map(date => ({
        date,
        name: "Company Holiday",
        type: "company",
      }));
  }
}

// Check if a specific date is a holiday
async function isHoliday(date) {
  const checkDate = new Date(date);
  const year = checkDate.getFullYear();
  const dateString = checkDate.toISOString().split('T')[0];

  try {
    const holidays = await getAllHolidays(year);
    return holidays.some(holiday => holiday.date === dateString);
  } catch (error) {
    console.error("Error checking holiday:", error);
    return companyHolidays.includes(dateString);
  }
}

// Check if a date is a working day (not weekend and not holiday)
async function isWorkingDay(date, user = null) {
  const checkDate = new Date(date);

  // Check weekend
  if (isWeekend(checkDate)) {
    return false;
  }

  // Check user-specific working days
  if (user && !user.shouldWorkOnDay(checkDate.getDay())) {
    return false;
  }

  // Check user-specific custom holidays
  if (user && user.hasCustomHoliday(checkDate)) {
    return false;
  }

  // Check general holidays
  const holidayStatus = await isHoliday(checkDate);
  return !holidayStatus;
}

// Get working days count in a date range
async function getWorkingDaysCount(startDate, endDate, user = null) {
  let workingDays = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    if (await isWorkingDay(currentDate, user)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

// Get all working days in a date range
async function getWorkingDays(startDate, endDate, user = null) {
  const workingDays = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    if (await isWorkingDay(currentDate, user)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

// Get holiday info for a specific date
async function getHolidayInfo(date) {
  const checkDate = new Date(date);
  const year = checkDate.getFullYear();
  const dateString = checkDate.toISOString().split('T')[0];

  if (isWeekend(checkDate)) {
    const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      isHoliday: true,
      type: 'weekend',
      name: dayName,
      date: dateString,
    };
  }

  try {
    const holidays = await getAllHolidays(year);
    const holiday = holidays.find(h => h.date === dateString);

    if (holiday) {
      return {
        isHoliday: true,
        type: holiday.type,
        name: holiday.name,
        date: dateString,
      };
    }
  } catch (error) {
    console.error("Error getting holiday info:", error);
  }

  return {
    isHoliday: false,
    type: 'working_day',
    name: 'Working Day',
    date: dateString,
  };
}

module.exports = {
  isWeekend,
  isHoliday,
  isWorkingDay,
  getAllHolidays,
  getGoogleHolidays,
  getWorkingDaysCount,
  getWorkingDays,
  getHolidayInfo,
  getISTDate,
};
