const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userRepo = require('../repositories/userRepo');
const tokenRepo = require('../repositories/tokenRepo');
const { publishUserRegistered } = require('../events/publisher');
const env = require('../config/env');

class AuthService {
  constructor() {
    this.privateKey = null;
    this.initializeKeys();
  }

  initializeKeys() {
    try {
      const privateKeyPath = path.resolve(env.JWT_PRIVATE_KEY_PATH);
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      console.log('JWT private key loaded successfully');
    } catch (error) {
      console.error('Failed to load JWT private key:', error.message);
      throw new Error('JWT private key not found. Please run: npm run generate-keys');
    }
  }

  generateAccessToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      email_verified: user.email_verified,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRY,
      issuer: 'auth-service',
      audience: 'club-management-system'
    });
  }

  async generateTokens(user, metadata = {}) {
    // Generate access token
    const accessToken = this.generateAccessToken(user);

    // Create refresh token
    const refreshToken = await tokenRepo.create({
      user_id: user.id,
      user_agent: metadata.userAgent,
      ip_address: metadata.ipAddress
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token
    };
  }

  async register(userData) {
    // Check if user already exists
    const existingUser = await userRepo.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Validate password
    this.validatePassword(userData.password);

    // Create user with default 'user' role only
    // Admin roles must be assigned separately by existing admins
    const user = await userRepo.create({
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
      roles: ['user'] // Always assign member role, ignore any user input
    });

    // Publish user registration event
    try {
      await publishUserRegistered({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        roles: user.roles,
        registeredAt: user.created_at
      });
    } catch (error) {
      console.error('Failed to publish user registration event:', error);
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles
    };
  }

  async login(email, password, metadata = {}) {
    // Find active user by email
    const user = await userRepo.findActiveByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last login
    await userRepo.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user, metadata);

    return tokens;
  }

  async refreshToken(refreshTokenValue, metadata = {}) {
    // Find and validate refresh token
    const refreshToken = await tokenRepo.findValidToken(refreshTokenValue);
    if (!refreshToken || !refreshToken.isValid()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const user = refreshToken.user;

    // Check if user is still active
    if (!user.is_active) {
      await tokenRepo.revokeToken(refreshTokenValue);
      throw new Error('USER_DEACTIVATED');
    }

    // Revoke old refresh token
    await tokenRepo.revokeToken(refreshTokenValue);

    // Generate new tokens
    const newTokens = await this.generateTokens(user, metadata);

    return newTokens;
  }

  async me(userId) {
    const user = await userRepo.findById(userId);
    if (!user || !user.is_active) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      email_verified: user.email_verified,
      last_login: user.last_login,
      created_at: user.created_at
    };
  }

  async logout(refreshTokenValue, userId) {
    if (refreshTokenValue) {
      // Revoke specific refresh token
      await tokenRepo.revokeToken(refreshTokenValue);
    } else if (userId) {
      // Revoke all user tokens if no specific token provided
      await tokenRepo.revokeAllUserTokens(userId);
    }

    return true;
  }

  async logoutAllDevices(userId) {
    await tokenRepo.revokeAllUserTokens(userId);
    return true;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.validatePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Update password
    await userRepo.update(userId, { password_hash: newPassword });

    // Revoke all refresh tokens to force re-authentication
    await tokenRepo.revokeAllUserTokens(userId);

    return true;
  }

  async resetPassword(email) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return true;
    }

    // In a real implementation, you would:
    // 1. Generate a password reset token
    // 2. Store it in database with expiration
    // 3. Send email with reset link
    // For now, we'll just log it
    console.log(`Password reset requested for: ${email}`);

    return true;
  }

  validatePassword(password) {
    if (!password || password.length < 8) {
      throw new Error('WEAK_PASSWORD');
    }

    // Add more password strength validation as needed
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('WEAK_PASSWORD');
    }
  }

  async getUserTokens(userId, options = {}) {
    return tokenRepo.findByUserId(userId, options);
  }

  async revokeUserToken(userId, tokenValue) {
    const refreshToken = await tokenRepo.findByToken(tokenValue);
    if (!refreshToken || refreshToken.user_id !== userId) {
      throw new Error('TOKEN_NOT_FOUND');
    }

    return tokenRepo.revokeToken(tokenValue);
  }

  async cleanupExpiredTokens() {
    return tokenRepo.cleanupExpiredTokens();
  }

  async getTokenStats() {
    return tokenRepo.getTokenStats();
  }
}

module.exports = new AuthService(); 