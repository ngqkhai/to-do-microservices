require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { sequelize } = require('./models');
const { setupRabbitMQ } = require('./config/rabbitmq');
const rabbitmqManager = require('./messaging/rabbitmq');
const { registerService, startHeartbeat } = require('./services/serviceRegistry');
const { logger } = require('./config/logger');
const { handleError } = require('./utils/errors');
const swaggerSpecs = require('./config/swagger');
const taskRoutes = require('./routes/tasks');
const healthRoutes = require('./routes/health');
const { extractUserFromHeaders } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(extractUserFromHeaders);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    userId: req.user?.id
  });
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Task Service',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .model-example { display: block !important; }
    .swagger-ui .model { display: block !important; }
    .swagger-ui .body-param .body-param__text { 
      font-family: monospace !important;
      background-color: #f7f7f7 !important;
      border: 1px solid #ddd !important;
      border-radius: 4px !important;
      padding: 10px !important;
      min-height: 100px !important;
    }
    .swagger-ui .parameters-col_description .parameter__name { 
      font-weight: bold !important;
    }
    .swagger-ui .response-col_description .response-col_description__inner div.markdown p {
      margin: 0 !important;
    }
    .swagger-ui .parameters .parameter__name { 
      font-weight: bold !important;
      color: #3b4151 !important;
    }
    .swagger-ui .parameters .parameter__type {
      color: #999 !important;
      font-size: 12px !important;
    }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=email], .swagger-ui textarea {
      border: 1px solid #d9d9d9 !important;
      border-radius: 4px !important;
      padding: 8px 12px !important;
    }
    .auth-header-info {
      background-color: #e8f4fd !important;
      border: 1px solid #b8daff !important;
      border-radius: 4px !important;
      padding: 15px !important;
      margin: 10px 0 !important;
      font-size: 14px !important;
    }
    .auth-header-info h4 {
      color: #004085 !important;
      margin-bottom: 10px !important;
    }
    .auth-header-info ul {
      margin: 5px 0 !important;
      padding-left: 20px !important;
    }
  `,
  customSiteTitle: 'Task Service API Documentation',
  customJs: `
    // Add information about additional headers
    setTimeout(() => {
      const authContainer = document.querySelector('.auth-container');
      if (authContainer && !document.querySelector('.auth-header-info')) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'auth-header-info';
        infoDiv.innerHTML = \`
          <h4>🔐 API Gateway Headers Required</h4>
          <p><strong>Primary Header:</strong> x-user-id (enter in the field above)</p>
          <p><strong>Additional Headers (add manually to requests):</strong></p>
          <ul>
            <li><code>x-user-email</code>: user@example.com</li>
            <li><code>x-user-full-name</code>: John Doe</li>
            <li><code>x-user-roles</code>: user,admin</li>
            <li><code>x-user-email-verified</code>: true</li>
          </ul>
          <p><em>💡 Tip: In production, these headers are automatically set by the API Gateway after authentication.</em></p>
        \`;
        authContainer.appendChild(infoDiv);
      }
    }, 1000);
  `,
  swaggerOptions: {
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    showExtensions: true,
    showCommonExtensions: true,
    requestInterceptor: (request) => {
      // Ensure content-type is application/json for all requests
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        request.headers['Content-Type'] = 'application/json';
      }
      
      // Add default headers if x-user-id is present but others are missing
      if (request.headers['x-user-id'] && !request.headers['x-user-email']) {
        request.headers['x-user-email'] = 'test@example.com';
        request.headers['x-user-full-name'] = 'Test User';
        request.headers['x-user-roles'] = 'user';
        request.headers['x-user-email-verified'] = 'true';
      }
      
      return request;
    }
  }
}));

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/health', healthRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  const errorResponse = handleError(err);
  res.status(errorResponse.statusCode).json(errorResponse.error);
});

async function startServer() {
  try {
    // Initialize database
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync database models
    await sequelize.sync();
    logger.info('Database models synchronized');

    // Initialize RabbitMQ (legacy)
    await setupRabbitMQ();
    logger.info('Legacy RabbitMQ connection established');

    // Initialize new RabbitMQ Manager for event publishing
    await rabbitmqManager.connect();
    logger.info('RabbitMQ Manager initialized for event publishing');

    // Register service with service registry
    await registerService(PORT);
    logger.info('Service registered with service registry');

    // Start heartbeat
    startHeartbeat(PORT);
    logger.info('Heartbeat started');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Task service listening on port ${PORT}`);
      logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', {
    reason: reason.message,
    stack: reason.stack
  });
  process.exit(1);
});

startServer(); 