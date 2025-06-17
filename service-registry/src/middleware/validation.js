const Joi = require('joi');

// Validation schemas
const schemas = {
  registerService: Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Service name can only contain letters, numbers, hyphens, and underscores'
      }),
    ip: Joi.string()
      .ip()
      .required(),
    port: Joi.number()
      .integer()
      .min(1)
      .max(65535)
      .required(),
    metadata: Joi.object().optional()
  }),

  heartbeat: Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required(),
    ip: Joi.string()
      .ip()
      .required(),
    port: Joi.number()
      .integer()
      .min(1)
      .max(65535)
      .required()
  }),

  serviceName: Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    let dataToValidate;
    
    // Determine data source based on request method
    if (req.method === 'GET') {
      dataToValidate = req.params;
    } else {
      dataToValidate = req.body;
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

    // Replace request data with validated and sanitized data
    if (req.method === 'GET') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Export validation middleware for different endpoints
module.exports = {
  validateRegisterService: validate(schemas.registerService),
  validateHeartbeat: validate(schemas.heartbeat),
  validateServiceName: validate(schemas.serviceName)
}; 