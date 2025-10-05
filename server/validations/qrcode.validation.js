const Joi = require('joi');

const createQRCode = Joi.object({
  organizationId: Joi.string().required(),
  
  qrType: Joi.string()
    .valid('check-in', 'check-out')
    .required(),
  
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().min(10).max(1000).default(100)
  }).optional()
});

const validateQRCode = Joi.object({
  code: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().optional()
  }).required()
});

module.exports = {
  createQRCode,
  validateQRCode
};
