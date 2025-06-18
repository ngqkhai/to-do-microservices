const axios = require('axios');
const env = require('../config/env');
const { logger } = require('../config/logger');

class ServiceRegistryClient {
  constructor() {
    this.registryUrl = env.SERVICE_REGISTRY_URL;
    this.serviceName = env.SERVICE_NAME;
    this.serviceIp = env.SERVICE_IP;
    this.servicePort = env.PORT;
    this.heartbeatInterval = env.HEARTBEAT_INTERVAL_MS;
    this.registryEnabled = env.REGISTRY_ENABLED;
    
    this.heartbeatTimer = null;
    this.isRegistered = false;
    
    // Setup axios instance with timeout
    this.client = axios.create({
      baseURL: this.registryUrl,
      timeout: 3000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${this.serviceName}/1.0.0`
      }
    });

    logger.info(`Service Registry Client initialized: ${this.registryUrl}`);
    logger.info(`Service: ${this.serviceName} at ${this.serviceIp}:${this.servicePort}`);
    logger.info(`Registry enabled: ${this.registryEnabled}`);
  }

  // Test connection to service registry
  async testConnection() {
    if (!this.registryEnabled) {
      return false;
    }

    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('Service registry health check failed:', error.message);
      return false;
    }
  }

  // Register service with the registry
  async register() {
    if (!this.registryEnabled) {
      logger.info('Service registry is disabled, skipping registration');
      return;
    }

    try {
      logger.info(`Registering service: ${this.serviceName} at ${this.serviceIp}:${this.servicePort}`);
      
      const registrationData = {
        name: this.serviceName,
        ip: this.serviceIp,
        port: this.servicePort,
        metadata: {
          version: '1.0.0',
          startTime: new Date().toISOString(),
          environment: env.NODE_ENV,
          features: ['task-reminders', 'event-processing', 'message-queuing', 'scheduled-scanning'],
          exchanges: {
            taskEvents: env.TASK_EVENTS_EXCHANGE,
            reminderEvents: env.REMINDER_EVENTS_EXCHANGE
          },
          queue: env.QUEUE_NAME,
          routingKeys: env.TASK_ROUTING_KEYS
        }
      };

      const response = await this.client.post('/register', registrationData);
      
      if (response.status === 201) {
        this.isRegistered = true;
        logger.info(`✅ Service registered successfully:`, response.data.instance.id);
        
        // Start heartbeat after successful registration
        this.startHeartbeat();
        
        return response.data;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      logger.error(`❌ Service registration failed:`, error.message);
      
      if (error.response) {
        logger.error(`Registry responded with ${error.response.status}:`, error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        logger.error('Service registry is not available. Service will continue without registration.');
      } else {
        logger.error('Registration error details:', error.message);
      }
      
      // Don't throw - service should continue even if registration fails
      return null;
    }
  }

  // Send heartbeat to registry
  async sendHeartbeat() {
    if (!this.registryEnabled || !this.isRegistered) {
      return;
    }

    try {
      const heartbeatData = {
        name: this.serviceName,
        ip: this.serviceIp,
        port: this.servicePort,
        timestamp: new Date().toISOString(),
        status: 'healthy'
      };

      await this.client.post('/heartbeat', heartbeatData);
      logger.debug('Heartbeat sent successfully');
      
    } catch (error) {
      logger.warn(`Heartbeat failed: ${error.message}`);
      
      if (error.response && error.response.status === 404) {
        logger.warn('Service not found in registry, attempting re-registration...');
        this.isRegistered = false;
        await this.register();
      }
    }
  }

  // Start sending periodic heartbeats
  startHeartbeat() {
    if (!this.registryEnabled || this.heartbeatTimer) {
      return;
    }

    logger.info(`Starting heartbeat timer (${this.heartbeatInterval}ms interval)`);
    
    this.heartbeatTimer = setInterval(async () => {
      await this.sendHeartbeat();
      logger.info('Heartbeat sent successfully');
    }, this.heartbeatInterval);
  }

  // Stop sending heartbeats
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      logger.info('Heartbeat timer stopped');
    }
  }

  // Deregister service from registry
  async deregister() {
    if (!this.registryEnabled || !this.isRegistered) {
      return;
    }

    try {
      // Stop heartbeat
      this.stopHeartbeat();

      logger.info(`Deregistering service: ${this.serviceName}`);
      
      const response = await this.client.delete(
        `/services/${this.serviceName}/instances?ip=${this.serviceIp}&port=${this.servicePort}`
      );
      
      if (response.status === 200) {
        this.isRegistered = false;
        logger.info(`✅ Service deregistered successfully`);
        return response.data;
      } else {
        logger.warn(`Deregistration returned status: ${response.status}`);
      }
      
    } catch (error) {
      logger.error(`❌ Service deregistration failed:`, error.message);
      
      if (error.response && error.response.status === 404) {
        logger.info('Service was not found in registry (already deregistered)');
        this.isRegistered = false;
      }
    }
  }

  // Get registry status
  getStatus() {
    return {
      enabled: this.registryEnabled,
      registered: this.isRegistered,
      registryUrl: this.registryUrl,
      serviceName: this.serviceName,
      heartbeatActive: !!this.heartbeatTimer
    };
  }
}

module.exports = new ServiceRegistryClient(); 