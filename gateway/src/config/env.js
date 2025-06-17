require('dotenv').config();

module.exports = {
  // Server configuration
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH,

  // DNS configuration
  DNS_SERVER_HOST: process.env.DNS_SERVER_HOST || '127.0.0.1',
  DNS_SERVER_PORT: parseInt(process.env.DNS_SERVER_PORT) || 8600,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // CORS configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:3001'],

  // Default service port
  DEFAULT_SERVICE_PORT: parseInt(process.env.DEFAULT_SERVICE_PORT) || 3000
}; 