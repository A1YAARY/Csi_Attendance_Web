const Joi = require('joi');

const createAttendance = Joi.object({
  qrCodeId: Joi.string().required(),
  
  type: Joi.string()
    .valid('check-in', 'check-out')
    .required(),
  
  location: Joi.object({
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .required(),
    
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .required(),
    
    accuracy: Joi.number().optional()
  }).required(),
  
  deviceInfo: Joi.object({
    deviceId: Joi.string().optional(),
    platform: Joi.string().optional(),
    userAgent: Joi.string().optional(),
    ipAddress: Joi.string().ip().optional()
  }).optional(),
  
  notes: Joi.string().max(500).optional()
});

module.exports = {
  createAttendance
};
