const Joi = require('joi');
const authService = require('../services/authService');
const { asyncErrorHandler } = require('../middlewares/errorHandler');
const env = require('../config/env');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  }),
  full_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Full name must be at least 2 characters long',
    'string.max': 'Full name must not exceed 100 characters',
    'any.required': 'Full name is required'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'New password must be at least 8 characters long',
    'any.required': 'New password is required'
  })
});

class AuthController {
  // POST /auth/register
  register = asyncErrorHandler(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          error: detail.message
        }))
      });
    }

    const user = await authService.register(value);

    res.status(201).json({
      id: user.id,
      message: 'User registered'
    });
  });

  // POST /auth/login
  login = asyncErrorHandler(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          error: detail.message
        }))
      });
    }

    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    const tokens = await authService.login(value.email, value.password, metadata);

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: env.COOKIE_MAX_AGE,
      path: '/'
    });

    res.status(200).json({
      access_token: tokens.access_token
    });
  });

  // POST /auth/refresh
  refresh = asyncErrorHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    const tokens = await authService.refreshToken(refreshToken, metadata);

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: env.COOKIE_MAX_AGE,
      path: '/'
    });

    res.status(200).json({
      access_token: tokens.access_token
    });
  });

  // GET /auth/me
  me = asyncErrorHandler(async (req, res) => {
    const user = await authService.me(req.user.id);

    res.status(200).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      email_verified: user.email_verified,
      last_login: user.last_login,
      created_at: user.created_at
    });
  });

  // POST /auth/logout
  logout = asyncErrorHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    const userId = req.user?.id;

    await authService.logout(refreshToken, userId);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/'
    });

    res.status(200).json({
      message: 'Logged out'
    });
  });

  // POST /auth/logout-all
  logoutAll = asyncErrorHandler(async (req, res) => {
    await authService.logoutAllDevices(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/'
    });

    res.status(200).json({
      message: 'Logged out from all devices'
    });
  });

  // POST /auth/change-password
  changePassword = asyncErrorHandler(async (req, res) => {
    // Validate request body
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          error: detail.message
        }))
      });
    }

    await authService.changePassword(
      req.user.id,
      value.current_password,
      value.new_password
    );

    // Clear refresh token cookie to force re-authentication
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/'
    });

    res.status(200).json({
      message: 'Password changed successfully'
    });
  });

  // POST /auth/reset-password
  resetPassword = asyncErrorHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required'
      });
    }

    const emailSchema = Joi.string().email().required();
    const { error } = emailSchema.validate(email);
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid email is required'
      });
    }

    await authService.resetPassword(email);

    res.status(200).json({
      message: 'Password reset instructions sent to your email'
    });
  });

  // GET /auth/tokens (admin only - get user's active tokens)
  getUserTokens = asyncErrorHandler(async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    const tokens = await authService.getUserTokens(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      tokens: tokens.rows.map(token => ({
        id: token.id,
        created_at: token.created_at,
        expires_at: token.expires_at,
        is_active: token.is_active,
        user_agent: token.user_agent,
        ip_address: token.ip_address
      })),
      pagination: {
        total: tokens.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < tokens.count
      }
    });
  });

  // DELETE /auth/tokens/:tokenId (revoke specific token)
  revokeToken = asyncErrorHandler(async (req, res) => {
    const { tokenId } = req.params;

    await authService.revokeUserToken(req.user.id, tokenId);

    res.status(200).json({
      message: 'Token revoked successfully'
    });
  });

  // Health check endpoint
  health = asyncErrorHandler(async (req, res) => {
    const { isEventPublisherHealthy } = require('../events/publisher');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected', // You could add actual DB health check here
        rabbitmq: isEventPublisherHealthy() ? 'connected' : 'disconnected'
      }
    });
  });
}

module.exports = new AuthController(); 