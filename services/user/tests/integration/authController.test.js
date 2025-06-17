const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../../src/routes/authRoutes');
const { errorHandler } = require('../../src/middlewares/errorHandler');

// Mock dependencies
jest.mock('../../src/services/authService');
jest.mock('../../src/models');

const authService = require('../../src/services/authService');

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use(errorHandler);

describe('Auth Controller Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        full_name: 'Test User'
      };

      const mockResponse = {
        id: 'user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        roles: ['member']
      };

      authService.register.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        id: 'user-id',
        message: 'User registered'
      });
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Test123!@#',
        full_name: 'Test User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'test@example.com'
        // missing password and full_name
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.details).toHaveLength(2);
    });

    it('should return 409 when email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        full_name: 'Test User'
      };

      authService.register.mockRejectedValue(new Error('EMAIL_EXISTS'));

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe('Email already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const mockTokens = {
        access_token: 'jwt-access-token',
        refresh_token: 'refresh-token-uuid'
      };

      authService.login.mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        access_token: 'jwt-access-token'
      });

      // Check if refresh token cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(cookie => cookie.includes('refresh_token=refresh-token-uuid'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should return 400 for invalid credentials format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'Test123!@#'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      authService.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'));

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockTokens = {
        access_token: 'new-jwt-access-token',
        refresh_token: 'new-refresh-token-uuid'
      };

      authService.refreshToken.mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=old-refresh-token')
        .expect(200);

      expect(response.body).toEqual({
        access_token: 'new-jwt-access-token'
      });

      // Check if new refresh token cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(cookie => cookie.includes('refresh_token=new-refresh-token-uuid'))).toBe(true);
    });

    it('should return 401 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 for invalid refresh token', async () => {
      authService.refreshToken.mockRejectedValue(new Error('INVALID_REFRESH_TOKEN'));

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user information', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        roles: ['member'],
        email_verified: false,
        last_login: new Date(),
        created_at: new Date()
      };

      authService.me.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Access token is required');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      authService.logout.mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('Cookie', 'refresh_token=refresh-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out'
      });

      // Check if refresh token cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(cookie => cookie.includes('refresh_token=;'))).toBe(true);
    });
  });
}); 