const nodemailer = require("nodemailer");

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
});

const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection established");
    return true;
  } catch (error) {
    console.error("❌ SMTP connection failed:", error);
    return false;
  }
};

// Auto-verify on load
verifyConnection();

const sendMail = async (to, subject, text, html) => {
  try {
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: `"Attendance System" <${user}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
};

const sendDeviceChangeNotification = async (userEmail, userName, deviceId) => {
  const istTime = getISTDate().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const subject = "Device Change Request Submitted";
  const text = `Hello ${userName},

Your device change request has been submitted successfully.

New Device ID: ${deviceId}
Request Time: ${istTime}

Your admin will review this request shortly.

Best regards,
Attendance System`;

  const html = `
    <h2>Device Change Request</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your device change request has been submitted successfully.</p>
    <p><strong>New Device ID:</strong> ${deviceId}</p>
    <p><strong>Request Time:</strong> ${istTime}</p>
    <p>Your admin will review this request shortly.</p>
    <br>
    <p>Best regards,<br>Attendance System</p>
  `;

  return await sendMail(userEmail, subject, text, html);
};

module.exports = {
  sendMail,
  sendDeviceChangeNotification,
  verifyConnection,
};
