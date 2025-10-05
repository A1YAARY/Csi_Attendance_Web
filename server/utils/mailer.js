const nodemailer = require('nodemailer');
const { ApiError } = require('../utils/errorHandler'); // New import

// Transporter configuration
let transporter;

function createTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // For production, add TLS options if needed
    tls: {
      rejectUnauthorized: false, // For testing; secure in production
    },
  });

  // Test connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP connection error:', error);
    } else {
      console.log('SMTP server ready');
    }
  });

  return transporter;
}

// Send email with template support
async function sendMail(to, subject, html, options = {}) {
  try {
    if (!to || !subject || !html) {
      throw new ApiError(400, 'Missing required email parameters', {
        code: 'INVALID_EMAIL_PARAMS',
        required: ['to', 'subject', 'html'],
      });
    }

    const transporter = createTransporter();
    const mailOptions = {
      from: `"CSI Attendance" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
      ...options, // Allow cc, bcc, attachments, etc.
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      recipients: info.accepted,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    // Classify common Nodemailer errors
    let code = 'EMAIL_SEND_FAILED';
    let details = {};
    if (error.code === 'EAUTH') {
      code = 'SMTP_AUTH_FAILED';
      details.suggestion = 'Check SMTP credentials';
    } else if (error.code === 'ECONNECTION') {
      code = 'SMTP_CONNECTION_FAILED';
      details.suggestion = 'Check SMTP host/port';
    }

    throw new ApiError(500, 'Failed to send email', {
      code: code,
      to: to,
      subject: subject,
      details: details,
    });
  }
}

// Generate HTML template (utility)
function generateTemplate(type, data) {
  const templates = {
    welcome: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D61E7;">Welcome to CSI Attendance System!</h2>
        <p>Hello ${data.name},</p>
        <p>Your account has been created. ${data.message || ''}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.link ? `<p><a href="${data.link}" style="background-color: #1D61E7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">${data.buttonText || 'Set Password'}</a></p>` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't request this, ignore this email.</p>
        <p>Organization: ${data.organization || 'CSI Attendance'}</p>
      </div>
    `,
    resetPassword: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D61E7;">Password Reset Request</h2>
        <p>Hello ${data.name},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${data.link}" style="background-color: #1D61E7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        <p><strong>This link expires in 24 hours.</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore.</p>
      </div>
    `,
    // Add more templates
  };

  if (!templates[type]) {
    throw new ApiError(400, 'Unknown email template type', { code: 'INVALID_TEMPLATE', type });
  }

  return templates[type].replace(/\${([^}]+)}/g, (_, key) => data[key] || '');
}

module.exports = {
  sendMail,
  generateTemplate,
  createTransporter, // For testing/internal
};
