const axios = require('axios');
const env = require('../config/env');

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

    console.log(`Service Registry Client initialized: ${this.registryUrl}`);
    console.log(`Service: ${this.serviceName} at ${this.serviceIp}:${this.servicePort}`);
    console.log(`Registry enabled: ${this.registryEnabled}`);
  }

  // Register service with the registry
  async register() {
    if (!this.registryEnabled) {
      console.log('Service registry is disabled, skipping registration');
      return;
    }

    try {
      console.log(`Registering service: ${this.serviceName} at ${this.serviceIp}:${this.servicePort}`);
      
      const registrationData = {
        name: this.serviceName,
        ip: this.serviceIp,
        port: this.servicePort,
        metadata: {
          version: '1.0.0',
          startTime: new Date().toISOString(),
          environment: env.NODE_ENV,
          features: ['authentication', 'user-management', 'jwt-tokens']
        }
      };

      const response = await this.client.post('/register', registrationData);
      
      if (response.status === 201) {
        this.isRegistered = true;
        console.log(`✅ Service registered successfully:`, response.data.instance.id);
        
        // Start heartbeat after successful registration
        this.startHeartbeat();
        
        return response.data;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Service registration failed:`, error.message);
      
      if (error.response) {
        console.error(`Registry responded with ${error.response.status}:`, error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        console.error('Service registry is not available. Service will continue without registration.');
      } else {
        console.error('Registration error details:', error.message);
      }
      
      // Don't throw - service should continue even if registration fails
      return null;
    }
  }

  // Start periodic heartbeat
  startHeartbeat() {
    if (!this.registryEnabled || !this.isRegistered) {
      return;
    }

    console.log(`Starting heartbeat every ${this.heartbeatInterval}ms`);
    
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('Heartbeat failed:', error.message);
        
        // If multiple heartbeats fail, try to re-register
        if (error.response && error.response.status === 404) {
          console.log('Service not found in registry, attempting re-registration...');
          this.isRegistered = false;
          await this.register();
        }
      }
    }, this.heartbeatInterval);
  }

  // Send heartbeat to registry
  async sendHeartbeat() {
    if (!this.registryEnabled || !this.isRegistered) {
      return;
    }

    const heartbeatData = {
      name: this.serviceName,
      ip: this.serviceIp,
      port: this.servicePort
    };

    const response = await this.client.post('/heartbeat', heartbeatData);
    
    if (response.status === 200) {
      console.log(`💓 Heartbeat sent successfully`);
      return response.data;
    } else {
      throw new Error(`Heartbeat failed with status: ${response.status}`);
    }
  }

  // Deregister service from registry
  async deregister() {
    if (!this.registryEnabled || !this.isRegistered) {
      return;
    }

    try {
      // Stop heartbeat
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      console.log(`Deregistering service: ${this.serviceName}`);
      
      const response = await this.client.delete(
        `/services/${this.serviceName}/instances?ip=${this.serviceIp}&port=${this.servicePort}`
      );
      
      if (response.status === 200) {
        this.isRegistered = false;
        console.log(`✅ Service deregistered successfully`);
        return response.data;
      } else {
        console.warn(`Deregistration returned status: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Service deregistration failed:`, error.message);
      
      if (error.response && error.response.status === 404) {
        console.log('Service was not found in registry (already deregistered)');
        this.isRegistered = false;
      }
    }
  }

  // Get service status from registry
  async getServiceStatus() {
    if (!this.registryEnabled) {
      return null;
    }

    try {
      const response = await this.client.get(`/resolve/${this.serviceName}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get service status:', error.message);
      return null;
    }
  }

  // Get registry statistics
  async getRegistryStats() {
    if (!this.registryEnabled) {
      return null;
    }

    try {
      const response = await this.client.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get registry stats:', error.message);
      return null;
    }
  }

  // Test registry connectivity
  async testConnection() {
    if (!this.registryEnabled) {
      return false;
    }

    try {
      const response = await this.client.get('/health');
      if (response.status === 200) {
        console.log(`✅ Registry connection test successful: ${response.data.status}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Registry connection test failed:`, error.message);
      return false;
    }
  }

  // Get client status
  getStatus() {
    return {
      enabled: this.registryEnabled,
      registered: this.isRegistered,
      service: {
        name: this.serviceName,
        ip: this.serviceIp,
        port: this.servicePort
      },
      registry: {
        url: this.registryUrl,
        heartbeatInterval: this.heartbeatInterval
      },
      heartbeatActive: this.heartbeatTimer !== null
    };
  }
}

module.exports = new ServiceRegistryClient(); 