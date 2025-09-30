// controllers/bulkUser.controller.js
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");
const User = require("../models/user.models");
const Organization = require("../models/organization.models");
const { sendMail } = require("../utils/mailer");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Helper: resolve organization by a provided code (name) or fallback to admin org
const resolveOrganization = async (fallbackOrgId, codeMaybe) => {
  if (codeMaybe && typeof codeMaybe === "string" && codeMaybe.trim()) {
    const org = await Organization.findOne({ name: codeMaybe.trim() });
    if (!org) return { error: `Invalid organization code: ${codeMaybe}` };
    return { org };
  }

  if (fallbackOrgId) {
    const org = await Organization.findById(fallbackOrgId);
    if (!org) return { error: "Organization not found for current user" };
    return { org };
  }

  return { error: "No organization context available" };
};

/**
 * Parse working hours from Excel columns
 */
const parseWorkingHours = (startTime, endTime) => {
  const defaultStart = "09:00";
  const defaultEnd = "18:00";
  
  // Handle time format (HH:MM or Excel time decimal)
  const formatTime = (time) => {
    if (!time) return null;
    
    // If it's a decimal (Excel time format)
    if (typeof time === 'number') {
      const hours = Math.floor(time * 24);
      const minutes = Math.floor((time * 24 * 60) % 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    // If it's already a string in HH:MM format
    if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
      const [h, m] = time.split(':');
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    
    return null;
  };

  return {
    start: formatTime(startTime) || defaultStart,
    end: formatTime(endTime) || defaultEnd,
  };
};

/**
 * Parse weekly schedule from Excel columns
 */
const parseWeeklySchedule = (row) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = {};
  
  days.forEach(day => {
    const columnName = `weeklySchedule${day.charAt(0).toUpperCase() + day.slice(1)}`;
    const value = row[columnName];
    
    // TRUE/true/"TRUE" = working day
    // FALSE/false/"FALSE" = weekly off
    // Default: Monday-Friday = true, Sat-Sun = false
    if (value === undefined || value === null || value === '') {
      schedule[day] = !['saturday', 'sunday'].includes(day);
    } else {
      schedule[day] = value === true || value === 'TRUE' || value === 'true' || value === 1;
    }
  });
  
  return schedule;
};

/**
 * Parse custom holidays from comma-separated dates
 */
const parseCustomHolidays = (holidaysString) => {
  if (!holidaysString || typeof holidaysString !== 'string') {
    return [];
  }
  
  return holidaysString
    .split(',')
    .map(date => {
      const trimmed = date.trim();
      // Support formats: YYYY-MM-DD or DD/MM/YYYY or Excel date numbers
      let parsed;
      
      // Check if it's an Excel date number (e.g., 45231)
      if (!isNaN(trimmed) && trimmed.length <= 5) {
        const excelDate = new Date((parseInt(trimmed) - 25569) * 86400 * 1000);
        parsed = excelDate;
      } else {
        parsed = new Date(trimmed);
      }
      
      return isNaN(parsed.getTime()) ? null : parsed;
    })
    .filter(date => date !== null);
};

const bulkRegisterUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No Excel file uploaded" });
    }

    // Organization context from JWT user and optional form field
    const adminOrgId = req.user?.organizationId;
    const requestOrgCode = req.body?.organizationCode;
    const orgContext = await resolveOrganization(adminOrgId, requestOrgCode);
    
    if (orgContext.error) {
      return res
        .status(400)
        .json({ success: false, message: orgContext.error });
    }

    // Load Excel from the uploaded path (cloud URL or buffer)
    let jsonData;
    try {
      const response = await axios.get(req.file.path, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
      });
      const buffer = Buffer.from(response.data);
      const workbook = xlsx.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      jsonData = xlsx.utils.sheet_to_json(worksheet);
    } catch (fileError) {
      console.error("File processing error:", fileError);
      return res.status(400).json({
        success: false,
        message: "Failed to process Excel file. Please check file format and size.",
      });
    }

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty or has no valid data",
      });
    }

    if (jsonData.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Too many users. Please process in batches of 1000 or fewer.",
      });
    }

    const results = {
      success: [],
      errors: [],
      duplicates: [],
      total: jsonData.length,
    };

    // Pre-fetch existing emails for duplicate checking
    const emailsInFile = jsonData
      .map((row) => row.email?.toLowerCase())
      .filter(Boolean);
    
    const existingUsers = await User.find({
      email: { $in: emailsInFile },
    }).select("email");
    
    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row (accounting for header)

      try {
        const {
          email,
          name,
          institute,
          department,
          password,
          phone,
          organizationCode: rowOrgCode,
          workingHoursStart,
          workingHoursEnd,
          customHolidays,
        } = row;

        // **VALIDATION: Required fields**
        if (!email || !name || !institute || !department || !password) {
          results.errors.push({
            row: rowNumber,
            email: email || "N/A",
            error: "Missing required fields (email, name, institute, department, password)",
          });
          continue;
        }

        // **VALIDATION: Email format**
        if (!emailRegex.test(email)) {
          results.errors.push({
            row: rowNumber,
            email,
            error: "Invalid email format",
          });
          continue;
        }

        const normalizedEmail = email.toLowerCase();

        // **VALIDATION: Duplicate check**
        if (existingEmails.has(normalizedEmail)) {
          results.duplicates.push({
            row: rowNumber,
            email: normalizedEmail,
            error: "User already exists",
          });
          continue;
        }

        // **Resolve organization for this row**
        const rowOrgContext = await resolveOrganization(
          orgContext.org?._id,
          rowOrgCode || requestOrgCode
        );
        
        if (rowOrgContext.error) {
          results.errors.push({
            row: rowNumber,
            email: normalizedEmail,
            error: rowOrgContext.error,
          });
          continue;
        }

        // **PARSE ATTENDANCE FIELDS**
        const workingHours = parseWorkingHours(workingHoursStart, workingHoursEnd);
        const weeklySchedule = parseWeeklySchedule(row);
        const customHolidaysList = parseCustomHolidays(customHolidays);

        // **Hash password before saving**
        const hashedPassword = await bcrypt.hash(password, 10);

        // **CREATE USER with all attendance fields**
        const user = new User({
          email: normalizedEmail,
          password: hashedPassword, // Store hashed password
          name: String(name).trim(),
          role: "user",
          institute: String(institute).trim(),
          department: String(department).trim(),
          phone: phone ? String(phone).trim() : undefined,
          organizationId: rowOrgContext.org._id,
          // **NEW: Attendance-specific fields**
          workingHours,
          weeklySchedule,
          customHolidays: customHolidaysList,
          deviceInfo: {
            isRegistered: false,
          },
        });

        await user.save();
        existingEmails.add(normalizedEmail); // Prevent duplicate in same batch

        // **Send welcome email with password reset link**
        const resetToken = jwt.sign(
          { userId: user._id },
          process.env.JWT_RESET_SECRET,
          { expiresIn: "24h" }
        );
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        try {
          await sendMail(
            user.email,
            "Welcome - Set Your Account Password",
            `Welcome to ${rowOrgContext.org.name}!\n\nYour account has been created. Please set your password by clicking the link below:\n\n${resetLink}\n\nThis link will expire in 24 hours.\n\nYour Details:\n- Name: ${user.name}\n- Email: ${user.email}\n- Department: ${user.department}\n- Institute: ${user.institute}\n- Working Hours: ${workingHours.start} - ${workingHours.end}`
          );
        } catch (emailError) {
          console.error("Email sending failed for:", user.email, emailError);
        }

        results.success.push({
          row: rowNumber,
          email: normalizedEmail,
          name: String(name).trim(),
          department: user.department,
          workingHours: `${workingHours.start} - ${workingHours.end}`,
          weeklyOffs: Object.entries(weeklySchedule)
            .filter(([day, working]) => !working)
            .map(([day]) => day)
            .join(', ') || 'None',
          message: "User created successfully",
        });

        console.log(`✅ Row ${rowNumber}: Created user ${normalizedEmail}`);
      } catch (error) {
        console.error(`❌ Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          email: row.email || "N/A",
          error: error.message,
        });
      }
    }

    return res.json({
      success: true,
      message: `Bulk registration completed. ${results.success.length} users created, ${results.errors.length} errors, ${results.duplicates.length} duplicates.`,
      summary: {
        total: results.total,
        successful: results.success.length,
        errors: results.errors.length,
        duplicates: results.duplicates.length,
      },
      results,
    });
  } catch (error) {
    console.error("Bulk registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process bulk registration",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Download Excel template with all attendance fields
 */
const downloadTemplate = async (req, res) => {
  try {
    const templateData = [
      {
        email: "john.doe@example.com",
        name: "John Doe",
        institute: "Computer Science Institute",
        department: "Software Engineering",
        password: "TempPass123!",
        phone: "9876543210",
        organizationCode: "YourOrgName",
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        weeklyScheduleMonday: "TRUE",
        weeklyScheduleTuesday: "TRUE",
        weeklyScheduleWednesday: "TRUE",
        weeklyScheduleThursday: "TRUE",
        weeklyScheduleFriday: "TRUE",
        weeklyScheduleSaturday: "FALSE",
        weeklyScheduleSunday: "FALSE",
        customHolidays: "2025-10-02,2025-12-25,2026-01-26",
      },
      {
        email: "jane.smith@example.com",
        name: "Jane Smith",
        institute: "Information Technology Institute",
        department: "Data Science",
        password: "TempPass456!",
        phone: "9988776655",
        organizationCode: "YourOrgName",
        workingHoursStart: "10:00",
        workingHoursEnd: "19:00",
        weeklyScheduleMonday: "TRUE",
        weeklyScheduleTuesday: "TRUE",
        weeklyScheduleWednesday: "TRUE",
        weeklyScheduleThursday: "TRUE",
        weeklyScheduleFriday: "TRUE",
        weeklyScheduleSaturday: "TRUE",
        weeklyScheduleSunday: "FALSE",
        customHolidays: "2025-08-15,2025-10-02",
      },
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    
    // Set column widths for better readability
    ws["!cols"] = [
      { wch: 30 }, // email
      { wch: 22 }, // name
      { wch: 30 }, // institute
      { wch: 22 }, // department
      { wch: 18 }, // password
      { wch: 15 }, // phone
      { wch: 22 }, // organizationCode
      { wch: 18 }, // workingHoursStart
      { wch: 18 }, // workingHoursEnd
      { wch: 22 }, // weeklyScheduleMonday
      { wch: 22 }, // weeklyScheduleTuesday
      { wch: 22 }, // weeklyScheduleWednesday
      { wch: 22 }, // weeklyScheduleThursday
      { wch: 22 }, // weeklyScheduleFriday
      { wch: 22 }, // weeklyScheduleSaturday
      { wch: 22 }, // weeklyScheduleSunday
      { wch: 35 }, // customHolidays
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Users");

    // **ADD INSTRUCTIONS SHEET**
    const instructions = [
      { Field: "email", Required: "Yes", Format: "Email", Example: "john@company.com", Description: "Unique email address" },
      { Field: "name", Required: "Yes", Format: "Text", Example: "John Doe", Description: "Full name of employee" },
      { Field: "institute", Required: "Yes", Format: "Text", Example: "Mumbai Office", Description: "Branch/Location name" },
      { Field: "department", Required: "Yes", Format: "Text", Example: "Engineering", Description: "Department/Team name" },
      { Field: "password", Required: "Yes", Format: "Text", Example: "TempPass123!", Description: "Temporary password (user will reset)" },
      { Field: "phone", Required: "No", Format: "Text", Example: "9876543210", Description: "Contact phone number" },
      { Field: "organizationCode", Required: "No", Format: "Text", Example: "YourOrgName", Description: "Organization name/code (optional)" },
      { Field: "workingHoursStart", Required: "No", Format: "HH:MM", Example: "09:00", Description: "Office start time (24-hour format)" },
      { Field: "workingHoursEnd", Required: "No", Format: "HH:MM", Example: "18:00", Description: "Office end time (24-hour format)" },
      { Field: "weeklyScheduleMonday", Required: "No", Format: "TRUE/FALSE", Example: "TRUE", Description: "Working on Monday? TRUE=Yes, FALSE=Weekly Off" },
      { Field: "weeklyScheduleTuesday", Required: "No", Format: "TRUE/FALSE", Example: "TRUE", Description: "Working on Tuesday?" },
      { Field: "weeklyScheduleWednesday", Required: "No", Format: "TRUE/FALSE", Example: "TRUE", Description: "Working on Wednesday?" },
      { Field: "weeklyScheduleThursday", Required: "No", Format: "TRUE/FALSE", Example: "TRUE", Description: "Working on Thursday?" },
      { Field: "weeklyScheduleFriday", Required: "No", Format: "TRUE/FALSE", Example: "TRUE", Description: "Working on Friday?" },
      { Field: "weeklyScheduleSaturday", Required: "No", Format: "TRUE/FALSE", Example: "FALSE", Description: "Working on Saturday? (FALSE=Weekly Off)" },
      { Field: "weeklyScheduleSunday", Required: "No", Format: "TRUE/FALSE", Example: "FALSE", Description: "Working on Sunday? (FALSE=Weekly Off)" },
      { Field: "customHolidays", Required: "No", Format: "YYYY-MM-DD,YYYY-MM-DD", Example: "2025-10-02,2025-12-25", Description: "Comma-separated holiday dates (personal leaves)" },
    ];

    const instructionsSheet = xlsx.utils.json_to_sheet(instructions);
    instructionsSheet["!cols"] = [
      { wch: 28 },
      { wch: 10 },
      { wch: 22 },
      { wch: 30 },
      { wch: 50 },
    ];
    xlsx.utils.book_append_sheet(wb, instructionsSheet, "Instructions");

    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bulk_user_attendance_template.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    return res.send(buffer);
  } catch (error) {
    console.error("Template download error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate template" });
  }
};

module.exports = { bulkRegisterUsers, downloadTemplate };
