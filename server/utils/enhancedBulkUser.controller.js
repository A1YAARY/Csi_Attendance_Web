// controllers/enhancedBulkUser.controller.js
const xlsx = require('xlsx');
const User = require('../models/user.models');
const { sendMail } = require('../utils/mailer');
const logger = require('../utils/logger');

class EnhancedBulkUserController {
  async bulkRegisterUsers(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No Excel file uploaded'
        });
      }

      // Enhanced file validation
      const validationResult = await this.validateExcelFile(req.file);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: 'File validation failed',
          errors: validationResult.errors
        });
      }

      // Process file with enhanced error handling
      const result = await this.processBulkUpload(req.file, req.user, req.body);

      res.json(result);

    } catch (error) {
      logger.error('Bulk upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Bulk upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async validateExcelFile(file) {
    const errors = [];
    
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        errors.push('Excel file is empty');
      }

      if (jsonData.length > 1000) {
        errors.push('Maximum 1000 users allowed per upload');
      }

      // Validate required columns
      const requiredColumns = ['email', 'name', 'department'];
      const firstRow = jsonData[0] || {};
      
      requiredColumns.forEach(col => {
        if (!firstRow.hasOwnProperty(col)) {
          errors.push(`Missing required column: ${col}`);
        }
      });

      // Validate email format in first few rows
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      jsonData.slice(0, 5).forEach((row, index) => {
        if (row.email && !emailRegex.test(row.email)) {
          errors.push(`Invalid email format in row ${index + 2}: ${row.email}`);
        }
      });

    } catch (error) {
      errors.push(`File parsing error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async processBulkUpload(file, user, options) {
    // Enhanced processing logic with progress tracking
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    const results = {
      total: jsonData.length,
      successful: 0,
      failed: 0,
      duplicates: 0,
      details: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];
        const result = await this.processSingleUser(row, user.organizationId, i + 2);
        results.details.push(result);
        
        if (result.status === 'success') results.successful++;
        else if (result.status === 'duplicate') results.duplicates++;
        else results.failed++;

      } catch (error) {
        results.details.push({
          row: i + 2,
          status: 'error',
          error: error.message
        });
        results.failed++;
      }
    }

    return {
      success: true,
      message: `Bulk upload completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicates} duplicates`,
      summary: results
    };
  }

  // ... rest of the enhanced methods
}

module.exports = new EnhancedBulkUserController();