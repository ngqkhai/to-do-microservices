const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const proxyMiddleware = require('./middleware/proxyMiddleware');
const gatewayRoutes = require('./routes/gatewayRoutes');
const dnsResolver = require('./services/dnsResolver');

class APIGateway {
  constructor() {
    this.app = express();
    this.port = config.PORT;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.startCleanupTasks();
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API gateway
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
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
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(express.raw({ limit: '10mb', type: 'application/octet-stream' }));

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
    // Gateway management routes
    this.app.use('/gateway', gatewayRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'API Gateway',
        version: '1.0.0',
        description: 'Node.js Express API Gateway with JWT validation and DNS-based service discovery',
        endpoints: {
          info: '/gateway/info',
          health: '/gateway/health',
          stats: '/gateway/stats'
        },
        usage: {
          authenticated: 'POST /service-name/endpoint (with Authorization header)',
          public: 'GET /service-name/endpoint (optional Authorization header)'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Main proxy routes - handle all traffic with authentication
    this.app.use('/*', proxyMiddleware.authenticatedProxy());
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        suggestion: 'Check if the service name is correct and the service is running',
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

  startCleanupTasks() {
    // Clean up stale requests every 5 minutes
    setInterval(() => {
      try {
        const proxyService = require('./services/proxyService');
        proxyService.cleanupStaleRequests();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    }, 5 * 60 * 1000);

    // Start DNS cache cleanup every minute
    dnsResolver.startCacheCleanup(60000);
  }

  async initializeDNS() {
    try {
      console.log('Initializing DNS resolver...');
      
      // Test DNS server connection
      const isConnected = await dnsResolver.testDNSConnection();
      
      if (isConnected) {
        console.log('✅ DNS server connection established');
      } else {
        console.warn('⚠️  DNS server connection failed - service resolution may not work');
        console.warn('Make sure the DNS server is running on port 8600');
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ DNS initialization failed:', error.message);
      console.warn('Gateway will continue but service resolution may not work');
      return false;
    }
  }

  async start() {
    try {
      // Initialize DNS resolver first
      await this.initializeDNS();

      this.server = this.app.listen(this.port, () => {
        console.log('\n=== API Gateway Started ===');
        console.log(`Port: ${this.port}`);
        console.log(`Environment: ${config.NODE_ENV}`);
        console.log(`DNS Server: ${config.DNS_SERVER_HOST}:${config.DNS_SERVER_PORT}`);
        console.log(`Health check: http://localhost:${this.port}/gateway/health`);
        console.log(`Gateway info: http://localhost:${this.port}/gateway/info`);
        console.log(`Statistics: http://localhost:${this.port}/gateway/stats`);
        console.log('\n=== Ready to proxy requests ===');
        console.log('Usage examples:');
        console.log(`  GET http://localhost:${this.port}/user-service/health`);
        console.log(`  POST http://localhost:${this.port}/task-service/api/tasks`);
        console.log(`  PUT http://localhost:${this.port}/notification-service/api/settings`);
        console.log('================================\n');
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('Failed to start API Gateway:', error);
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
          
          console.log('API Gateway shut down gracefully');
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

// Start the API Gateway
const gateway = new APIGateway();
gateway.start(); 