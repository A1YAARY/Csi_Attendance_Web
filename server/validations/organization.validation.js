const Joi = require('joi');

const createOrganization = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(200),
  
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
    fullAddress: Joi.string().optional()
  }).optional(),
  
  location: Joi.object({
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .required(),
    
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .required(),
    
    radius: Joi.number()
      .min(10)
      .max(1000)
      .default(100),
    
    address: Joi.string().optional()
  }).required(),
  
  settings: Joi.object({
    timezone: Joi.string().default('Asia/Kolkata'),
    qrCodeValidityMinutes: Joi.number().min(5).max(1440).default(30),
    locationToleranceMeters: Joi.number().min(10).max(500).default(100),
    requireDeviceRegistration: Joi.boolean().default(true),
    strictLocationVerification: Joi.boolean().default(true)
  }).optional()
});

const updateOrganization = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
    fullAddress: Joi.string().optional()
  }).optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().min(10).max(1000).optional()
  }).optional(),
  settings: Joi.object({
    qrCodeValidityMinutes: Joi.number().min(5).max(1440).optional(),
    locationToleranceMeters: Joi.number().min(10).max(500).optional(),
    requireDeviceRegistration: Joi.boolean().optional(),
    strictLocationVerification: Joi.boolean().optional()
  }).optional()
});

module.exports = {
  createOrganization,
  updateOrganization
};
