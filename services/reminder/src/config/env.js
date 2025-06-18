require('dotenv').config();

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3004,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  DB_URL: process.env.DB_URL || 'postgres://postgres:password@localhost:5432/reminderdb',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'reminderdb',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',

  // RabbitMQ Configuration
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost',
  TASK_EVENTS_EXCHANGE: process.env.TASK_EVENTS_EXCHANGE || 'task-events',
  REMINDER_EVENTS_EXCHANGE: process.env.REMINDER_EVENTS_EXCHANGE || 'reminder-events',
  EXCHANGE_TYPE: process.env.EXCHANGE_TYPE || 'topic',
  QUEUE_NAME: process.env.QUEUE_NAME || 'reminder-service-task-events',
  TASK_ROUTING_KEYS: (process.env.TASK_ROUTING_KEYS || 'task.created,task.updated,task.completed,task.deleted').split(','),
  QUEUE_DURABLE: process.env.QUEUE_DURABLE !== 'false',
  MESSAGE_PERSISTENT: process.env.MESSAGE_PERSISTENT !== 'false',
  PREFETCH_COUNT: parseInt(process.env.PREFETCH_COUNT) || 1,

  // Service Configuration
  SCAN_INTERVAL_MS: parseInt(process.env.SCAN_INTERVAL_MS) || 60000, // 1 minute

  // Service Registry Configuration
  SERVICE_REGISTRY_URL: process.env.SERVICE_REGISTRY_URL || 'http://localhost:3100',
  SERVICE_NAME: process.env.SERVICE_NAME || 'reminder-service',
  SERVICE_IP: process.env.SERVICE_IP || '127.0.0.1',
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS) || 5000,
  REGISTRY_ENABLED: process.env.REGISTRY_ENABLED !== 'false',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
}; 