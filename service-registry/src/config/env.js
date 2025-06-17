require('dotenv').config();

module.exports = {
  // Server configuration
  PORT: process.env.PORT || 3100,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Service health configuration
  HEARTBEAT_TIMEOUT_SECONDS: parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS) || 10,
  CLEANUP_INTERVAL_SECONDS: parseInt(process.env.CLEANUP_INTERVAL_SECONDS) || 5,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // CORS configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:8080'],

  // Registry configuration
  MAX_INSTANCES_PER_SERVICE: parseInt(process.env.MAX_INSTANCES_PER_SERVICE) || 10,
  SERVICE_TTL_MULTIPLIER: parseInt(process.env.SERVICE_TTL_MULTIPLIER) || 3
}; 