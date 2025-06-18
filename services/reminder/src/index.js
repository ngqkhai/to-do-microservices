const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const { testConnection, initializeTables, closeConnection } = require('./config/database');
const { sequelize } = require('./models');
const rabbitmq = require('./config/rabbitmq');
const { swaggerUi, specs } = require('./config/swagger');
const { logger } = require('./config/logger');
const reminderService = require('./services/reminderService');
const taskEventHandler = require('./handlers/taskEventHandler');
const reminderRoutes = require('./routes/reminderRoutes');
const serviceRegistry = require('./services/serviceRegistry');

class ReminderServiceApp {
  constructor() {
    this.app = express();
    this.port = env.PORT;
    this.server = null;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: env.NODE_ENV === 'development' ? true : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy
    this.app.set('trust proxy', 1);

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  initializeRoutes() {
    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Reminder Service API'
    }));

    // Mount reminder routes
    this.app.use('/', reminderRoutes);
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        service: 'reminder-service',
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Global error handler:', error);
      
      if (res.headersSent) {
        return next(error);
      }

      const statusCode = error.statusCode || error.status || 500;
      
      res.status(statusCode).json({
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
        service: 'reminder-service',
        timestamp: new Date().toISOString(),
        ...(env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  async initializeDatabase() {
    try {
      logger.info('Initializing database connection...');
      
      // Test Sequelize connection
      await sequelize.authenticate();
      logger.info('✅ Sequelize database connection established');

      // Sync models (in development only)
      if (env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        logger.info('✅ Database models synchronized');
      }

      // Also test Knex connection for compatibility
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Knex database');
      }

      const tablesInitialized = await initializeTables();
      if (!tablesInitialized) {
        throw new Error('Failed to initialize database tables');
      }

      return true;
    } catch (error) {
      logger.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  async initializeRabbitMQ() {
    try {
      logger.info('Initializing RabbitMQ connection...');
      
      const isConnected = await rabbitmq.connect();
      if (!isConnected) {
        throw new Error('Failed to connect to RabbitMQ');
      }

      // Subscribe to task events
      await rabbitmq.subscribeToTaskEvents(async (routingKey, eventData) => {
        await taskEventHandler.processEvent(routingKey, eventData);
      });

      return true;
    } catch (error) {
      logger.error('❌ RabbitMQ initialization failed:', error.message);
      throw error;
    }
  }

  async startReminderScanner() {
    try {
      logger.info('Starting reminder scanner...');
      reminderService.startScanner(env.SCAN_INTERVAL_MS);
      return true;
    } catch (error) {
      logger.error('❌ Failed to start reminder scanner:', error.message);
      throw error;
    }
  }

  async registerWithServiceRegistry() {
    try {
      // Test registry connection first
      if (env.REGISTRY_ENABLED) {
        logger.info('Testing service registry connection...');
        const isConnected = await serviceRegistry.testConnection();
        
        if (isConnected) {
          // Register the service
          await serviceRegistry.register();
        } else {
          logger.warn('Service registry is not available. Service will continue without registration.');
        }
      }
    } catch (error) {
      logger.error('Failed to connect to service registry:', error.message);
      logger.warn('Service will continue without registration.');
    }
  }

  async start() {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Initialize RabbitMQ
      await this.initializeRabbitMQ();

      // Start reminder scanner
      await this.startReminderScanner();

      // Register with service registry
      await this.registerWithServiceRegistry();

      // Start HTTP server
      this.server = this.app.listen(this.port, () => {
        logger.info('\n=== Reminder Service Started ===');
        logger.info(`Port: ${this.port}`);
        logger.info(`Environment: ${env.NODE_ENV}`);
        logger.info(`Scanner Interval: ${env.SCAN_INTERVAL_MS}ms`);
        logger.info(`Service Registry: ${env.REGISTRY_ENABLED ? 'Enabled' : 'Disabled'}`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
        logger.info(`Stats: http://localhost:${this.port}/stats`);
        logger.info(`API Documentation: http://localhost:${this.port}/api-docs`);
        logger.info(`Reminders API: http://localhost:${this.port}/api/reminders`);
        logger.info('\n=== Ready to process task events ===');
        logger.info('Listening for:');
        logger.info('  - task.created');
        logger.info('  - task.updated');
        logger.info('  - task.completed');
        logger.info('  - task.deleted');
        logger.info('Publishing to:');
        logger.info('  - reminder.reminder_triggered');
        logger.info('  - reminder.reminder_created');
        logger.info('  - reminder.reminder_updated');
        logger.info('  - reminder.reminder_deleted');
        logger.info('================================\n');
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start Reminder Service:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop reminder scanner
        reminderService.stopScanner();

        // Deregister from service registry
        await serviceRegistry.deregister();

        // Close HTTP server
        if (this.server) {
          await new Promise((resolve) => {
            this.server.close(resolve);
          });
          logger.info('✅ HTTP server closed');
        }

        // Close RabbitMQ connection
        await rabbitmq.close();

        // Close database connections
        await closeConnection(); // Knex
        await sequelize.close(); // Sequelize

        logger.info('✅ Reminder Service shut down gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }
}

// Start the service
const reminderApp = new ReminderServiceApp();
reminderApp.start(); 