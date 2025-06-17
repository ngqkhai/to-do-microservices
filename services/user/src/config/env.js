require('dotenv').config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_PRIVATE_KEY_PATH',
  'RABBITMQ_URL'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH,
  RABBITMQ_URL: process.env.RABBITMQ_URL,
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT configuration
  JWT_ACCESS_TOKEN_EXPIRY: '15m',
  JWT_REFRESH_TOKEN_EXPIRY: '7d',
  
  // Cookie configuration
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_SAME_SITE: 'strict',

  // Service Registry configuration
  SERVICE_REGISTRY_URL: process.env.SERVICE_REGISTRY_URL || 'http://localhost:3100',
  SERVICE_NAME: process.env.SERVICE_NAME || 'user-service',
  SERVICE_IP: process.env.SERVICE_IP || '127.0.0.1',
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS) || 5000,
  REGISTRY_ENABLED: process.env.REGISTRY_ENABLED === 'true'
}; 