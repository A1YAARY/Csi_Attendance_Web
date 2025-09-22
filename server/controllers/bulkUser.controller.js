// controllers/bulkUser.controller.js
const xlsx = require("xlsx");
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

const bulkRegisterUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No Excel file uploaded" });
    }

    // Organization context from JWT user and optional form field
    const adminOrgId = req.user?.organizationId;
    const requestOrgCode = req.body?.organizationCode; // from multipart form field
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
        message:
          "Failed to process Excel file. Please check file format and size.",
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
    const emailsInFile = jsonData
      .map((row) => row.email?.toLowerCase())
      .filter(Boolean);
    const existingUsers = await User.find({
      email: { $in: emailsInFile },
    }).select("email");
    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      try {
        const {
          email,
          name,
          institute,
          department,
          password,
          organizationCode: rowOrgCode,
        } = row;

        if (!email || !name || !institute || !department || !password) {
          results.errors.push({
            row: rowNumber,
            email: email || "N/A",
            error:
              "Missing required fields (email, name, institute, department, password)",
          });
          continue;
        }

        if (!emailRegex.test(email)) {
          results.errors.push({
            row: rowNumber,
            email,
            error: "Invalid email format",
          });
          continue;
        }

        const normalizedEmail = email.toLowerCase();
        if (existingEmails.has(normalizedEmail)) {
          results.duplicates.push({
            row: rowNumber,
            email: normalizedEmail,
            error: "User already exists",
          });
          continue;
        }

        // Resolve org for this row (row code > request code > admin org)
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

        const user = new User({
          email: normalizedEmail,
          password: password,
          name: String(name).trim(),
          role: "user",
          institute: String(institute).trim(),
          department: String(department).trim(),
          organizationId: rowOrgContext.org._id,
        });

        await user.save();
        existingEmails.add(normalizedEmail);

        // Send set-password email
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
            `Your account has been created. Please set your password: ${resetLink}\n\nThis link will expire in 24 hours.`
          );
        } catch (emailError) {
          console.error("Email sending failed for:", user.email, emailError);
        }

        results.success.push({
          row: rowNumber,
          email: normalizedEmail,
          name: String(name).trim(),
          message: "User created successfully",
        });
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
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
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Template now includes organizationCode as optional column
const downloadTemplate = async (req, res) => {
  try {
    const templateData = [
      {
        email: "john.doe@example.com",
        name: "John Doe",
        institute: "Computer Science Institute",
        department: "Software Engineering",
        password: "TempPass123!",
        organizationCode: "YourOrgName", // optional per-row override
      },
      {
        email: "jane.smith@example.com",
        name: "Jane Smith",
        institute: "Information Technology Institute",
        department: "Data Science",
        password: "TempPass456!",
        organizationCode: "YourOrgName",
      },
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 28 }, // email
      { wch: 22 }, // name
      { wch: 28 }, // institute
      { wch: 22 }, // department
      { wch: 16 }, // password
      { wch: 22 }, // organizationCode
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Users");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bulk_user_registration_template.xlsx"
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
