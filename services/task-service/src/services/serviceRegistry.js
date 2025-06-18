const axios = require('axios');
const { logger } = require('../config/logger');
const { RegistryError } = require('../utils/errors');

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;
const SERVICE_NAME = process.env.SERVICE_NAME || 'task-service';
const SERVICE_IP = process.env.SERVICE_IP || '127.0.0.1';
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '5000', 10);
const REGISTRY_ENABLED = process.env.REGISTRY_ENABLED !== 'false';

let heartbeatInterval;
let isRegistered = false;
let serviceInfo = null;

function getServiceInfo(port) {
  return {
    name: SERVICE_NAME,
    ip: SERVICE_IP,
    port: port
  };
}

async function registerService(port) {
  if (!REGISTRY_ENABLED) {
    logger.info('Service registry integration is disabled');
    return;
  }

  serviceInfo = getServiceInfo(port);

  try {
    const response = await axios.post(`${SERVICE_REGISTRY_URL}/register`, serviceInfo);
    
    isRegistered = true;
    logger.info('Service registered successfully:', response.data);
    return response.data;
  } catch (error) {
    isRegistered = false;
    const errorMessage = error.response?.data?.message || error.message;
    logger.error('Failed to register service:', {
      error: errorMessage,
      code: error.code,
      response: error.response?.data
    });
    throw new RegistryError(`Failed to register service: ${errorMessage}`);
  }
}

async function sendHeartbeat() {
  if (!REGISTRY_ENABLED || !isRegistered || !serviceInfo) {
    return;
  }

  try {
    await axios.post(`${SERVICE_REGISTRY_URL}/heartbeat`, serviceInfo);
    logger.debug('Heartbeat sent successfully');
  } catch (error) {
    logger.error('Failed to send heartbeat:', {
      error: error.message,
      code: error.code,
      response: error.response?.data
    });

    // If heartbeat fails, try to re-register
    if (error.response?.status === 404) {
      logger.info('Service not found in registry, attempting to re-register...');
      try {
        await registerService(serviceInfo.port);
      } catch (regError) {
        logger.error('Failed to re-register service:', {
          error: regError.message,
          code: regError.code
        });
      }
    }
  }
}

function startHeartbeat(port) {
  if (!REGISTRY_ENABLED) {
    logger.info('Heartbeat disabled - service registry integration is disabled');
    return;
  }

  // Clear any existing interval
  stopHeartbeat();

  // Ensure service info is set
  serviceInfo = getServiceInfo(port);

  // Send initial heartbeat
  sendHeartbeat().catch(error => {
    logger.error('Initial heartbeat failed:', {
      error: error.message,
      code: error.code
    });
  });

  // Start periodic heartbeat
  heartbeatInterval = setInterval(() => {
    sendHeartbeat().catch(error => {
      logger.error('Periodic heartbeat failed:', {
        error: error.message,
        code: error.code
      });
    });
  }, HEARTBEAT_INTERVAL_MS);

  logger.info(`Heartbeat started with interval ${HEARTBEAT_INTERVAL_MS}ms`);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    logger.info('Heartbeat stopped');
  }
}

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  stopHeartbeat();
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal');
  stopHeartbeat();
});

module.exports = {
  registerService,
  startHeartbeat,
  stopHeartbeat
}; 