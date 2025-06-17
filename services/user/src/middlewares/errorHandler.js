const env = require('../config/env');

// Error mapping for common application errors
const ERROR_MAPPINGS = {
  EMAIL_EXISTS: {
    status: 409,
    error: 'Conflict',
    message: 'Email already exists'
  },
  INVALID_CREDENTIALS: {
    status: 401,
    error: 'Unauthorized',
    message: 'Invalid email or password'
  },
  INVALID_REFRESH_TOKEN: {
    status: 401,
    error: 'Unauthorized',
    message: 'Invalid refresh token'
  },
  USER_NOT_FOUND: {
    status: 404,
    error: 'Not Found',
    message: 'User not found'
  },
  USER_DEACTIVATED: {
    status: 403,
    error: 'Forbidden',
    message: 'User account has been deactivated'
  },
  WEAK_PASSWORD: {
    status: 400,
    error: 'Bad Request',
    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters'
  },
  INVALID_CURRENT_PASSWORD: {
    status: 400,
    error: 'Bad Request',
    message: 'Current password is incorrect'
  },
  TOKEN_NOT_FOUND: {
    status: 404,
    error: 'Not Found',
    message: 'Token not found or does not belong to user'
  }
};

// Validation error handler for Joi and Sequelize validation errors
const handleValidationError = (error) => {
  const details = [];

  if (error.name === 'ValidationError') {
    // Handle Joi validation errors
    if (error.details && Array.isArray(error.details)) {
      error.details.forEach(detail => {
        details.push({
          field: detail.path.join('.'),
          error: detail.message
        });
      });
    }
  } else if (error.name === 'SequelizeValidationError') {
    // Handle Sequelize validation errors
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach(err => {
        details.push({
          field: err.path,
          error: err.message
        });
      });
    }
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    // Handle unique constraint errors
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach(err => {
        if (err.path === 'email') {
          details.push({
            field: 'email',
            error: 'Email already exists'
          });
        } else {
          details.push({
            field: err.path,
            error: `${err.path} must be unique`
          });
        }
      });
    }
  }

  return {
    status: 400,
    error: 'Bad Request',
    message: 'Validation failed',
    details
  };
};

// Async error wrapper to catch promise rejections
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Main error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle validation errors
  if (error.name === 'ValidationError' || 
      error.name === 'SequelizeValidationError' || 
      error.name === 'SequelizeUniqueConstraintError') {
    const validationError = handleValidationError(error);
    return res.status(validationError.status).json(validationError);
  }

  // Handle mapped application errors
  if (ERROR_MAPPINGS[error.message]) {
    const mappedError = ERROR_MAPPINGS[error.message];
    return res.status(mappedError.status).json(mappedError);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token has expired'
    });
  }

  // Handle Sequelize database errors
  if (error.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Database operation failed'
    });
  }

  if (error.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed'
    });
  }

  // Handle rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Handle generic HTTP errors
  if (error.status && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({
      error: error.name || 'Client Error',
      message: error.message || 'Bad request'
    });
  }

  // Handle unexpected errors
  const isDevelopment = env.NODE_ENV === 'development';
  
  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    ...(isDevelopment && {
      details: {
        message: error.message,
        stack: error.stack
      }
    })
  });
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
};

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler,
  handleValidationError
}; 