const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const registryRoutes = require('./routes/registryRoutes');

class ServiceRegistryApp {
  constructor() {
    this.app = express();
    this.port = config.PORT;
    
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
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (config.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        // Check allowed origins
        if (config.ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Request logging middleware
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'service-registry',
        version: '1.0.0',
        uptime: process.uptime()
      });
    });

    // Root endpoint with service info
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Service Registry',
        version: '1.0.0',
        description: 'Microservice registry for service discovery',
        endpoints: {
          register: 'POST /register',
          heartbeat: 'POST /heartbeat',
          resolve: 'GET /resolve/:name',
          services: 'GET /services',
          stats: 'GET /stats',
          health: 'GET /health'
        },
        configuration: {
          heartbeatTimeout: `${config.HEARTBEAT_TIMEOUT_SECONDS}s`,
          cleanupInterval: `${config.CLEANUP_INTERVAL_SECONDS}s`,
          maxInstancesPerService: config.MAX_INSTANCES_PER_SERVICE
        },
        timestamp: new Date().toISOString()
      });
    });

    // Registry API routes
    this.app.use('/', registryRoutes);
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: [
          'POST /register',
          'POST /heartbeat',
          'GET /resolve/:name',
          'GET /services',
          'GET /stats',
          'GET /health'
        ],
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);
      
      if (res.headersSent) {
        return next(error);
      }

      const statusCode = error.statusCode || error.status || 500;
      
      res.status(statusCode).json({
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        ...(config.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  async start() {
    try {
      this.server = this.app.listen(this.port, () => {
        console.log('\n=== Service Registry Started ===');
        console.log(`Port: ${this.port}`);
        console.log(`Environment: ${config.NODE_ENV}`);
        console.log(`Heartbeat timeout: ${config.HEARTBEAT_TIMEOUT_SECONDS}s`);
        console.log(`Cleanup interval: ${config.CLEANUP_INTERVAL_SECONDS}s`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        console.log(`Registry info: http://localhost:${this.port}/`);
        console.log(`Statistics: http://localhost:${this.port}/stats`);
        console.log('\n=== API Endpoints ===');
        console.log(`POST   http://localhost:${this.port}/register`);
        console.log(`POST   http://localhost:${this.port}/heartbeat`);
        console.log(`GET    http://localhost:${this.port}/resolve/:name`);
        console.log(`GET    http://localhost:${this.port}/services`);
        console.log('\n=== Ready for service registrations ===\n');
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('Failed to start Service Registry:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
      
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
          }
          
          console.log('Service Registry shut down gracefully');
          process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error('Force shutdown due to timeout');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }
}

// Start the Service Registry
const registry = new ServiceRegistryApp();
registry.start(); 