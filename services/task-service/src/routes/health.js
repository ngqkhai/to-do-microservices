const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { getRabbitMQConnection } = require('../config/rabbitmq');
const { logger } = require('../config/logger');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check service health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 time:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 db:
 *                   type: boolean
 *                   example: true
 *                 rabbitmq:
 *                   type: boolean
 *                   example: true
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(), // Total uptime in seconds
    db: false,
    rabbitmq: false
  };

  try {
    // Check database connection
    await sequelize.authenticate();
    health.db = true;
    logger.info('Database health check passed');
  } catch (error) {
    logger.error('Database health check failed:', {
      error: error.message,
      stack: error.stack
    });
    health.status = 'degraded';
  }

  try {
    // Check RabbitMQ connection
    const connection = await getRabbitMQConnection();
    if (connection) {
      health.rabbitmq = true;
      logger.info('RabbitMQ health check passed');
    }
  } catch (error) {
    logger.error('RabbitMQ health check failed:', {
      error: error.message,
      stack: error.stack
    });
    health.status = 'degraded';
  }

  // If any check failed, set status to degraded
  if (!health.db || !health.rabbitmq) {
    health.status = 'degraded';
  }

  res.json(health);
});

/**
 * @swagger
 * /health/headers:
 *   get:
 *     summary: Check received headers from API Gateway (Debug endpoint)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Headers received from API Gateway
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 headers:
 *                   type: object
 *                   description: All received headers
 *                 userHeaders:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: user-123
 *                     userEmail:
 *                       type: string
 *                       example: user@example.com
 *                     userFullName:
 *                       type: string
 *                       example: John Doe
 *                     userRoles:
 *                       type: string
 *                       example: user,admin
 *                     emailVerified:
 *                       type: string
 *                       example: true
 */
router.get('/headers', (req, res) => {
  const userHeaders = {
    userId: req.headers['x-user-id'],
    userEmail: req.headers['x-user-email'],
    userFullName: req.headers['x-user-full-name'],
    userRoles: req.headers['x-user-roles'],
    emailVerified: req.headers['x-user-email-verified']
  };

  // Filter out undefined values
  const filteredUserHeaders = Object.fromEntries(
    Object.entries(userHeaders).filter(([_, value]) => value !== undefined)
  );

  res.json({
    userHeaders: filteredUserHeaders,
    allHeaders: req.headers,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 