require('dotenv').config();

const env = {
  // Service Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3005,
  SERVICE_NAME: process.env.SERVICE_NAME || 'notification-service',

  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'notification_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',

  // RabbitMQ Configuration
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE || 'reminder-events',
  RABBITMQ_QUEUE: process.env.RABBITMQ_QUEUE || 'notification-service-queue',

  // Gmail SMTP Configuration
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@todo-app.com',

  // Service Registry
  SERVICE_REGISTRY_URL: process.env.SERVICE_REGISTRY_URL || 'http://localhost:3001',
  REGISTRY_ENABLED: process.env.REGISTRY_ENABLED === 'true',
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL) || 30000,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/notification.log',

  // Retry Configuration
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS) || 5000,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
};

// Validate required environment variables
const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASSWORD'];

for (const envVar of requiredEnvVars) {
  if (!env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

module.exports = env; 