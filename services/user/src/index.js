const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { sequelize } = require('./models');
const { connectEventPublisher } = require('./events/publisher');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { specs, swaggerUi } = require('./config/swagger');
const serviceRegistry = require('./services/serviceRegistry');

class AuthServiceApp {
  constructor() {
    this.app = express();
    this.port = env.PORT;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In development, allow all origins
        if (env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        // In production, specify allowed origins
        const allowedOrigins = [
          'http://localhost:3000',
          'https://club-management.example.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true, // Allow cookies to be sent
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Trust proxy for accurate IP addresses (important for rate limiting)
    this.app.set('trust proxy', 1);

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const registryStatus = serviceRegistry.getStatus();
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '1.0.0',
        registry: {
          enabled: registryStatus.enabled,
          registered: registryStatus.registered,
          heartbeatActive: registryStatus.heartbeatActive
        }
      });
    });

    // Swagger UI documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Auth Service API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
      }
    }));

    // Swagger JSON endpoint
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });

    // API routes
    this.app.use('/auth', authRoutes);

    // Registry status endpoint (for debugging)
    this.app.get('/registry-status', async (req, res) => {
      try {
        const status = serviceRegistry.getStatus();
        const serviceStatus = await serviceRegistry.getServiceStatus();
        const registryStats = await serviceRegistry.getRegistryStats();
        
        res.status(200).json({
          client: status,
          serviceInstances: serviceStatus,
          registryStats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get registry status',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Auth Service API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          auth: '/auth',
          docs: '/api-docs',
          'docs-json': '/api-docs.json'
        }
      });
    });
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async connectDatabase() {
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      
      // Run migrations in production
      if (env.NODE_ENV === 'production') {
        await sequelize.sync();
        console.log('Database synchronized.');
      }
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  async connectMessageQueue() {
    try {
      await connectEventPublisher();
      console.log('RabbitMQ connection established successfully.');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      // Don't throw error for RabbitMQ - service can run without events
      console.warn('Service will continue without event publishing.');
    }
  }

  async registerWithServiceRegistry() {
    try {
      // Test registry connection first
      if (env.REGISTRY_ENABLED) {
        console.log('Testing service registry connection...');
        const isConnected = await serviceRegistry.testConnection();
        
        if (isConnected) {
          // Register the service
          await serviceRegistry.register();
        } else {
          console.warn('Service registry is not available. Service will continue without registration.');
        }
      }
    } catch (error) {
      console.error('Failed to connect to service registry:', error);
      console.warn('Service will continue without registration.');
    }
  }

  async start() {
    try {
      // Connect to database
      await this.connectDatabase();

      // Connect to message queue
      await this.connectMessageQueue();

      // Start the server
      this.server = this.app.listen(this.port, async () => {
        console.log(`Auth Service is running on port ${this.port}`);
        console.log(`Environment: ${env.NODE_ENV}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        
        // Register with service registry after server is running
        await this.registerWithServiceRegistry();
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

      // Clean up expired and old revoked tokens every 24 hours
      const startTokenCleanup = () => {
        const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

        setInterval(async () => {
          try {
            console.log('Running token cleanup...');
            
            // Clean up expired tokens
            const expiredCount = await tokenRepo.cleanupExpiredTokens();
            console.log(`Cleaned up ${expiredCount} expired tokens`);
            
            // Clean up revoked tokens older than 30 days
            const revokedCount = await tokenRepo.cleanupRevokedTokens(30);
            console.log(`Cleaned up ${revokedCount} old revoked tokens`);
            
          } catch (error) {
            console.error('Token cleanup failed:', error);
          }
        }, cleanupInterval);
      };

      // Start cleanup scheduler
      startTokenCleanup();

    } catch (error) {
      console.error('Failed to start auth service:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    // Handle graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      if (this.server) {
        this.server.close(async () => {
          console.log('HTTP server closed.');

          try {
            // Deregister from service registry
            await serviceRegistry.deregister();
            console.log('Service deregistered from registry.');

            // Close database connection
            await sequelize.close();
            console.log('Database connection closed.');

            // Close RabbitMQ connection
            const { closeEventPublisher } = require('./events/publisher');
            await closeEventPublisher();
            console.log('RabbitMQ connection closed.');

            console.log('Graceful shutdown completed.');
            process.exit(0);
          } catch (error) {
            console.error('Error during graceful shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          console.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 30000);
      }
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }
}

// Create and start the application
const authService = new AuthServiceApp();
authService.start();

module.exports = authService; 