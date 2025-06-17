const axios = require('axios');
const config = require('../config/env');

class RegistryClient {
  constructor() {
    this.registryUrl = config.REGISTRY_URL;
    this.timeout = config.REGISTRY_TIMEOUT_MS;
    this.cache = new Map();
    this.cacheTimeout = config.CACHE_TTL_SECONDS * 1000;
    
    // Setup axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: this.registryUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DNS-Server/1.0.0'
      }
    });

    console.log(`Registry client initialized: ${this.registryUrl}`);
  }

  async resolveService(serviceName) {
    const cacheKey = serviceName;
    const cached = this.cache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      if (config.LOG_REGISTRY_CALLS) {
        console.log(`Registry cache hit for ${serviceName}: ${cached.instances.length} instances`);
      }
      return cached.instances;
    }

    try {
      if (config.LOG_REGISTRY_CALLS) {
        console.log(`Querying registry for service: ${serviceName}`);
      }

      const response = await this.axiosInstance.get(`/resolve/${serviceName}`);
      
      if (response.status === 200 && response.data.instances) {
        const instances = response.data.instances;
        
        // Cache the result
        this.cache.set(cacheKey, {
          instances,
          timestamp: Date.now()
        });

        if (config.LOG_REGISTRY_CALLS) {
          console.log(`Registry resolved ${serviceName}: ${instances.length} healthy instances`);
        }

        return instances;
      } else {
        throw new Error(`Unexpected response format: ${response.status}`);
      }

    } catch (error) {
      if (config.LOG_REGISTRY_CALLS) {
        if (error.response && error.response.status === 404) {
          console.log(`Service not found in registry: ${serviceName}`);
        } else if (error.code === 'ECONNREFUSED') {
          console.error(`Registry connection refused: ${serviceName}`);
        } else if (error.code === 'ETIMEDOUT') {
          console.error(`Registry timeout for service: ${serviceName}`);
        } else {
          console.error(`Registry error for ${serviceName}:`, error.message);
        }
      }

      // Try to use cached result even if expired as fallback
      if (cached) {
        console.log(`Using expired cache for ${serviceName}: ${cached.instances.length} instances`);
        return cached.instances;
      }

      // Return empty array if no instances found
      return [];
    }
  }

  // Get a random healthy IP from service instances
  getRandomHealthyIP(instances) {
    if (!instances || instances.length === 0) {
      console.log(`🔍 getRandomHealthyIP: No instances provided`);
      return null;
    }

    console.log(`🔍 getRandomHealthyIP Debug:`, {
      totalInstances: instances.length,
      instances: instances.map(i => ({
        ip: i.ip,
        port: i.port,
        status: i.status,
        hasIP: !!i.ip
      }))
    });

    // Filter for healthy instances (should already be healthy from registry)
    const healthyInstances = instances.filter(instance => 
      instance.status === 'healthy' && instance.ip
    );

    console.log(`🔍 Filtered healthy instances:`, {
      healthyCount: healthyInstances.length,
      totalCount: instances.length,
      healthyInstances: healthyInstances.map(i => ({ ip: i.ip, port: i.port, status: i.status }))
    });

    if (healthyInstances.length === 0) {
      console.log(`🔍 No healthy instances found after filtering`);
      return null;
    }

    // Return random healthy instance IP
    const randomIndex = Math.floor(Math.random() * healthyInstances.length);
    const selectedInstance = healthyInstances[randomIndex];

    console.log(`Selected random instance: ${selectedInstance.ip}:${selectedInstance.port} from ${healthyInstances.length} healthy instances`);
    
    return selectedInstance.ip;
  }

  // Get registry statistics (for monitoring)
  async getRegistryStats() {
    try {
      const response = await this.axiosInstance.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get registry stats:', error.message);
      return null;
    }
  }

  // Clear cache for a specific service
  clearCache(serviceName) {
    if (serviceName) {
      this.cache.delete(serviceName);
      console.log(`Cache cleared for service: ${serviceName}`);
    } else {
      this.cache.clear();
      console.log('All cache cleared');
    }
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    const stats = {
      total: this.cache.size,
      valid: 0,
      expired: 0,
      services: []
    };

    for (const [serviceName, data] of this.cache.entries()) {
      const isValid = (now - data.timestamp) < this.cacheTimeout;
      
      if (isValid) {
        stats.valid++;
      } else {
        stats.expired++;
      }

      stats.services.push({
        name: serviceName,
        instances: data.instances.length,
        age: Math.round((now - data.timestamp) / 1000),
        valid: isValid
      });
    }

    return stats;
  }

  // Test registry connectivity
  async testConnection() {
    try {
      const response = await this.axiosInstance.get('/health');
      console.log(`Registry connection test successful: ${response.data.status}`);
      return true;
    } catch (error) {
      console.error('Registry connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new RegistryClient(); 