const { google } = require("googleapis");
const path = require("path");

// Path to your service account JSON
// const SERVICE_ACCOUNT_FILE = path.join("service-account.json");
const SERVICE_ACCOUNT_FILE = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

// Google Calendar ID for India holidays
const HOLIDAY_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";

// Authenticate using service account
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});

// Initialize Google Calendar API client
const calendar = google.calendar({ version: "v3", auth });

// Example company-specific holidays (from DB later)
const companyHolidays = [
  "2025-01-26",
  "2025-08-15",
  "2025-12-31",
];

// ✅ Check weekend
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// ✅ Fetch holidays from Google Calendar
async function getGoogleHolidays(year) {
  const res = await calendar.events.list({
    calendarId: HOLIDAY_CALENDAR_ID,
    timeMin: new Date(`${year}-01-01`).toISOString(),
    timeMax: new Date(`${year}-12-31`).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items.map((event) => event.start.date);
}

// ✅ Main checker
async function isWorkingDay(date) {
  const isoDate = date.toISOString().split("T")[0];
  const year = date.getFullYear();

  // Check weekend
  if (isWeekend(date)) return false;

  // Check company holidays
  if (companyHolidays.includes(isoDate)) return false;

  // Check Google public holidays
  const googleHolidays = await getGoogleHolidays(year);
  if (googleHolidays.includes(isoDate)) return false;

  return true;
}

module.exports = {
  isWorkingDay,
  getGoogleHolidays,
};






// const { google } = require("googleapis");

// // Replace with your API key
// const API_KEY = "";

// // Example: India holiday calendar
// const HOLIDAY_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";

// // Initialize Google Calendar API client
// const calendar = google.calendar({ version: "v3", auth: API_KEY });

// // Example company-specific holidays (from DB later)
// const companyHolidays = [
//   "2025-01-26",
//   "2025-08-15",
//   "2025-12-31",
// ];

// // ✅ Check weekend
// function isWeekend(date) {
//   const day = date.getDay();
//   return day === 0 || day === 6;
// }

// // ✅ Fetch holidays from Google Calendar
// async function getGoogleHolidays(year) {
//   const res = await calendar.events.list({
//     calendarId: HOLIDAY_CALENDAR_ID,
//     timeMin: new Date(`${year}-01-01`).toISOString(),
//     timeMax: new Date(`${year}-12-31`).toISOString(),
//     singleEvents: true,
//     orderBy: "startTime",
//   });

//   return res.data.items.map((event) => event.start.date);
// }

// // ✅ Main checker
// async function isWorkingDay(date) {
//   const isoDate = date.toISOString().split("T")[0];
//   const year = date.getFullYear();

//   if (isWeekend(date)){
//      return false
//     };
//   if (companyHolidays.includes(isoDate)){
//     return false
//     };
//   const googleHolidays = await getGoogleHolidays(year);
//   if (googleHolidays.includes(isoDate)){
//     return false
//   };
//   return true;
// }

// module.exports = {
//   isWorkingDay,
//   getGoogleHolidays,
// };
