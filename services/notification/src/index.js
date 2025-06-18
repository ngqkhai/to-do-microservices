const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const { logger } = require('./config/logger');
const rabbitmqManager = require('./config/rabbitmq');
const notificationService = require('./services/notificationService');

class NotificationApp {
  constructor() {
    this.app = express();
    this.server = null;
  }

  async initialize() {
    try {
      logger.info('🚀 Starting Notification Service...', {
        service: env.SERVICE_NAME,
        port: env.PORT,
        nodeEnv: env.NODE_ENV
      });

      // Setup Express middleware
      this.setupMiddleware();
      this.setupRoutes();

      // Initialize services
      await notificationService.initialize();

      // Connect to RabbitMQ and start consuming
      await this.setupRabbitMQ();

      // Start HTTP server
      await this.startServer();

      logger.info('✅ Notification Service started successfully', {
        port: env.PORT,
        pid: process.pid
      });

    } catch (error) {
      logger.error('❌ Failed to start Notification Service:', { error: error.message });
      process.exit(1);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('📥 HTTP Request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await notificationService.getHealthStatus();
        const rabbitMQStatus = rabbitmqManager.getConnectionStatus();
        
        res.json({
          ...health,
          rabbitmq: rabbitMQStatus
        });
      } catch (error) {
        res.status(500).json({
          service: 'notification-service',
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: env.SERVICE_NAME,
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      logger.error('❌ Express error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong'
      });
    });
  }

  async setupRabbitMQ() {
    try {
      logger.info('🔌 Setting up RabbitMQ connection...');

      // Connect to RabbitMQ
      await rabbitmqManager.connect();

      // Setup exchange and queue
      await rabbitmqManager.setupExchangeAndQueue();

      // Start consuming messages
      await rabbitmqManager.consumeMessages(async (routingKey, eventData) => {
        await notificationService.processEvent(routingKey, eventData);
      });

      logger.info('✅ RabbitMQ setup completed successfully');

    } catch (error) {
      logger.error('❌ Failed to setup RabbitMQ:', { error: error.message });
      throw error;
    }
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(env.PORT, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async shutdown() {
    logger.info('🛑 Shutting down Notification Service...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('✅ HTTP server closed');
      }

      // Close RabbitMQ connection
      await rabbitmqManager.close();

      // Shutdown notification service
      await notificationService.shutdown();

      logger.info('✅ Notification Service shut down gracefully');
      process.exit(0);

    } catch (error) {
      logger.error('❌ Error during shutdown:', { error: error.message });
      process.exit(1);
    }
  }
}

// Create and start the application
const app = new NotificationApp();

// Handle graceful shutdown
process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', { error: error.message, stack: error.stack });
  app.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { reason, promise });
  app.shutdown();
});

// Start the application
app.initialize(); 