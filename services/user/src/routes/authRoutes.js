const express = require('express');
const authController = require('../controllers/authController');
const { jwtValidate } = require('../middlewares/jwtValidate');
const { 
  registerLimiter, 
  loginLimiter, 
  refreshLimiter, 
  apiLimiter 
} = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user (assigns 'user' role by default)
 *     tags: [Authentication]
 *     description: Creates a new user account with 'user' role. Admin roles must be assigned separately by existing administrators.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Bad request - validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Bad Request"
 *               message: "Validation failed"
 *               details:
 *                 - field: "email"
 *                   error: "Email is required"
 *                 - field: "password"
 *                   error: "Password must be at least 8 characters long"
 *       409:
 *         description: Conflict - email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Conflict"
 *               message: "Email already exists"
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Too Many Requests"
 *               message: "Too many registration attempts from this IP, please try again after 1 hour."
 */
// Public endpoint - no authentication required
router.post('/register', registerLimiter, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token cookie (HTTP-only, Secure, SameSite=Strict)
 *             schema:
 *               type: string
 *               example: "refresh_token=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Unauthorized"
 *               message: "Invalid email or password"
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Public endpoint - no authentication required
router.post('/login', loginLimiter, authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Authentication]
 *     parameters:
 *       - in: cookie
 *         name: refresh_token
 *         required: true
 *         schema:
 *           type: string
 *         description: Refresh token (HTTP-only cookie)
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             description: New refresh token cookie (rotated)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Unauthorized - invalid or missing refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Unauthorized"
 *               message: "Invalid refresh token"
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Public endpoint - uses refresh token cookie, no JWT validation needed
router.post('/refresh', refreshLimiter, authController.refresh);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication via API Gateway. Gateway validates JWT and passes user info in headers.
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Unauthorized"
 *               message: "Access token is required"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Not Found"
 *               message: "User not found"
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Protected endpoint - requires user info from Gateway headers
router.get('/me', apiLimiter, jwtValidate, authController.me);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and revoke refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication via API Gateway. Revokes refresh token and clears cookie.
 *     parameters:
 *       - in: cookie
 *         name: refresh_token
 *         schema:
 *           type: string
 *         description: Refresh token to revoke (optional)
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token cookie cleared
 *             schema:
 *               type: string
 *               example: "refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Logged out"
 *       401:
 *         description: Unauthorized - missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Protected endpoint - requires user info from Gateway headers
router.post('/logout', apiLimiter, jwtValidate, authController.logout);

module.exports = router; 