const express = require('express');
const reminderController = require('../controllers/reminderController');
const { extractUserFromHeaders } = require('../middlewares/auth');
const { handleError } = require('../utils/errors');
const reminderService = require('../services/reminderService');
const rabbitmq = require('../config/rabbitmq');
const serviceRegistry = require('../services/serviceRegistry');

const router = express.Router();

/**
 * GET /health - Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const dbStats = await reminderService.getStats();
    const rabbitmqStatus = rabbitmq.getStatus();
    const registryStatus = serviceRegistry.getStatus();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'reminder-service',
      version: '1.0.0',
      uptime: process.uptime(),
      database: {
        connected: true,
        reminders: dbStats
      },
      rabbitmq: rabbitmqStatus,
      serviceRegistry: registryStatus
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'reminder-service',
      error: error.message
    });
  }
});

/**
 * GET / - Service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'reminder-service',
    version: '1.0.0',
    description: 'Microservice for handling task reminders with RabbitMQ and PostgreSQL',
    endpoints: {
      health: '/health',
      reminders: '/api/reminders',
      userReminders: '/api/reminders/my',
      pendingReminders: '/api/reminders/pending',
      sentReminders: '/api/reminders/sent',
      stats: '/stats',
      scan: '/scan (POST)',
      swagger: '/api-docs'
    },
    timestamp: new Date().toISOString()
  });
});

// Apply authentication middleware to protected routes
router.use('/api', extractUserFromHeaders);

/**
 * @swagger
 * /api/reminders:
 *   get:
 *     summary: Get all reminders (admin)
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of reminders to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of reminders to skip
 *     responses:
 *       200:
 *         description: List of all reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reminders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get('/api/reminders', reminderController.getAllReminders);

/**
 * @swagger
 * /api/reminders/my:
 *   get:
 *     summary: Get current user's reminders
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent]
 *         description: Filter by reminder status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of reminders to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of reminders to skip
 *     responses:
 *       200:
 *         description: List of user's reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reminders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get('/api/reminders/my', reminderController.getUserReminders);

/**
 * @swagger
 * /api/reminders/pending:
 *   get:
 *     summary: Get current user's pending reminders
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     responses:
 *       200:
 *         description: List of pending reminders
 */
router.get('/api/reminders/pending', reminderController.getPendingReminders);

/**
 * @swagger
 * /api/reminders/sent:
 *   get:
 *     summary: Get current user's sent reminders
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     responses:
 *       200:
 *         description: List of sent reminders
 */
router.get('/api/reminders/sent', reminderController.getSentReminders);

/**
 * @swagger
 * /api/reminders:
 *   post:
 *     summary: Create a new reminder (manual)
 *     description: Creates a reminder for the authenticated user. User ID is automatically extracted from authentication headers.
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReminderRequest'
 *     responses:
 *       201:
 *         description: Reminder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 */
router.post('/api/reminders', reminderController.createReminder);

/**
 * @swagger
 * /api/reminders/{taskId}:
 *   put:
 *     summary: Update a reminder
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID associated with the reminder
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReminderRequest'
 *     responses:
 *       200:
 *         description: Reminder updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 */
router.put('/api/reminders/:taskId', reminderController.updateReminder);

/**
 * @swagger
 * /api/reminders/{taskId}:
 *   delete:
 *     summary: Delete a reminder
 *     tags: [Reminders]
 *     security:
 *       - ApiGatewayAuth: []
 *         UserHeaders: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID associated with the reminder
 *     responses:
 *       204:
 *         description: Reminder deleted successfully
 */
router.delete('/api/reminders/:taskId', reminderController.deleteReminder);

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get service statistics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReminderStats'
 */
router.get('/stats', reminderController.getStats);

/**
 * @swagger
 * /scan:
 *   post:
 *     summary: Manually trigger reminder scan
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Scan completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 triggered:
 *                   type: integer
 *                 total:
 *                   type: integer
 */
router.post('/scan', reminderController.triggerScan);

// Error handling middleware
router.use((error, req, res, next) => {
  const { statusCode, error: errorData } = handleError(error);
  res.status(statusCode).json(errorData);
});

module.exports = router; 