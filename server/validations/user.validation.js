const Joi = require('joi');

// Register validation
const registerUser = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .lowercase()
        .messages({
            'string.email': 'Please provide a valid email',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'any.required': 'Password is required'
        }),

    name: Joi.string()
        .required()
        .min(2)
        .max(100)
        .messages({
            'any.required': 'Name is required'
        }),

    institute: Joi.string()
        .optional()
        .allow(''),

    department: Joi.string()
        .optional()
        .allow(''),

    role: Joi.string()
        .valid('organization', 'user')
        .required()
        .messages({
            'any.only': 'Role must be either organization or user'
        }),

    organizationId: Joi.string()
        .when('role', {
            is: 'user',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'any.required': 'Organization ID is required for user role'
        })
});

// Login validation
const loginUser = Joi.object({
    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .required()
});

// Update user validation
const updateUser = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .optional(),

    institute: Joi.string()
        .optional()
        .allow(''),

    department: Joi.string()
        .optional()
        .allow(''),

    workingHours: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).optional()
});

// Device registration validation
const registerDevice = Joi.object({
    deviceId: Joi.string().required(),
    deviceType: Joi.string().optional(),
    deviceFingerprint: Joi.string().optional(),
    location: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        accuracy: Joi.number().optional()
    }).required()
});

module.exports = {
    registerUser,
    loginUser,
    updateUser,
    registerDevice
};
