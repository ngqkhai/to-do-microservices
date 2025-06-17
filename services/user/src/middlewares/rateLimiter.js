const rateLimit = require('express-rate-limit');

// General auth rate limiter - for login, register, etc.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    });
  }
});

// Strict rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many login attempts from this IP, please try again after 15 minutes.'
    });
  }
});

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 3 registration requests per hour
  message: {
    error: 'Too Many Requests',
    message: 'Too many registration attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many registration attempts from this IP, please try again after 1 hour.'
    });
  }
});

// Rate limiter for password reset requests
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too Many Requests',
    message: 'Too many password reset attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many password reset attempts from this IP, please try again after 1 hour.'
    });
  }
});

// Rate limiter for refresh token requests
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Allow more refresh requests as they're used frequently
  message: {
    error: 'Too Many Requests',
    message: 'Too many token refresh attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many token refresh attempts from this IP, please try again after 15 minutes.'
    });
  }
});

// General API rate limiter for protected routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for general API calls
  message: {
    error: 'Too Many Requests',
    message: 'Too many API requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many API requests from this IP, please try again after 15 minutes.'
    });
  }
});

// Custom rate limiter that can be configured dynamically
const createCustomLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message
      });
    }
  });
};

module.exports = {
  authLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
  apiLimiter,
  createCustomLimiter
}; 