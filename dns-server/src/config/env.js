require('dotenv').config();

module.exports = {
  // DNS Server configuration
  PORT: parseInt(process.env.PORT) || 8600,
  HOST: process.env.HOST || '127.0.0.1',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Service Registry configuration
  REGISTRY_URL: process.env.REGISTRY_URL || 'http://localhost:3100',
  REGISTRY_TIMEOUT_MS: parseInt(process.env.REGISTRY_TIMEOUT_MS) || 2000,

  // DNS configuration
  DEFAULT_TTL: parseInt(process.env.DEFAULT_TTL) || 30,
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS) || 10,

  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DNS_QUERIES: process.env.LOG_DNS_QUERIES === 'true',
  LOG_REGISTRY_CALLS: process.env.LOG_REGISTRY_CALLS === 'true'
}; 