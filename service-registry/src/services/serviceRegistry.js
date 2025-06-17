const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

class ServiceRegistry {
  constructor() {
    // Map<serviceName, Array<serviceInstance>>
    this.services = new Map();
    this.stats = {
      totalRegistrations: 0,
      totalHeartbeats: 0,
      totalCleanups: 0,
      activeServices: 0,
      activeInstances: 0
    };
    
    this.startCleanupProcess();
    console.log('Service Registry initialized');
  }

  // Register a new service instance
  registerService(name, ip, port, metadata = {}) {
    const instanceId = uuidv4();
    const now = Date.now();
    
    const instance = {
      id: instanceId,
      name: name.trim(),
      ip: ip.trim(),
      port: parseInt(port),
      status: 'healthy',
      registeredAt: now,
      lastHeartbeat: now,
      metadata: metadata || {}
    };

    // Validate instance data
    if (!this.validateInstance(instance)) {
      throw new Error('Invalid service instance data');
    }

    // Get or create service entry
    if (!this.services.has(name)) {
      this.services.set(name, []);
    }

    const instances = this.services.get(name);
    
    // Check if instance already exists (same IP:port)
    const existingIndex = instances.findIndex(
      inst => inst.ip === ip && inst.port === parseInt(port)
    );

    if (existingIndex >= 0) {
      // Update existing instance
      instances[existingIndex] = { ...instances[existingIndex], ...instance };
      console.log(`Service instance updated: ${name} at ${ip}:${port} (${instanceId})`);
    } else {
      // Add new instance
      instances.push(instance);
      console.log(`Service instance registered: ${name} at ${ip}:${port} (${instanceId})`);
      
      // Limit instances per service
      if (instances.length > config.MAX_INSTANCES_PER_SERVICE) {
        const removed = instances.shift();
        console.log(`Removed oldest instance for ${name}: ${removed.ip}:${removed.port}`);
      }
    }

    this.stats.totalRegistrations++;
    this.updateStats();
    
    return instance;
  }

  // Update service heartbeat
  updateHeartbeat(name, ip, port) {
    if (!this.services.has(name)) {
      throw new Error(`Service not found: ${name}`);
    }

    const instances = this.services.get(name);
    const instance = instances.find(
      inst => inst.ip === ip && inst.port === parseInt(port)
    );

    if (!instance) {
      throw new Error(`Service instance not found: ${name} at ${ip}:${port}`);
    }

    instance.lastHeartbeat = Date.now();
    instance.status = 'healthy';
    
    this.stats.totalHeartbeats++;
    
    console.log(`Heartbeat received: ${name} at ${ip}:${port} (${instance.id})`);
    
    return instance;
  }

  // Get healthy instances for a service
  resolveService(name) {
    if (!this.services.has(name)) {
      return [];
    }

    const instances = this.services.get(name);
    const now = Date.now();
    const timeoutMs = config.HEARTBEAT_TIMEOUT_SECONDS * 1000;

    const healthyInstances = instances.filter(instance => {
      const timeSinceHeartbeat = now - instance.lastHeartbeat;
      return timeSinceHeartbeat <= timeoutMs && instance.status === 'healthy';
    });

    console.log(`Resolved ${name}: ${healthyInstances.length} healthy instances`);
    
    // Return instances sorted by last heartbeat (most recent first)
    return healthyInstances.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
  }

  // Get all services and their instances
  getAllServices() {
    const result = {};
    
    for (const [serviceName, instances] of this.services.entries()) {
      result[serviceName] = {
        instanceCount: instances.length,
        healthyCount: this.getHealthyInstanceCount(serviceName),
        instances: instances.map(instance => ({
          ...instance,
          isHealthy: this.isInstanceHealthy(instance),
          timeSinceHeartbeat: Date.now() - instance.lastHeartbeat
        }))
      };
    }

    return result;
  }

  // Get service statistics
  getStats() {
    this.updateStats();
    return {
      ...this.stats,
      services: Array.from(this.services.keys()),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // Validate service instance data
  validateInstance(instance) {
    if (!instance.name || typeof instance.name !== 'string') {
      return false;
    }
    if (!instance.ip || typeof instance.ip !== 'string') {
      return false;
    }
    if (!instance.port || !Number.isInteger(instance.port) || instance.port <= 0 || instance.port > 65535) {
      return false;
    }
    return true;
  }

  // Check if instance is healthy
  isInstanceHealthy(instance) {
    const now = Date.now();
    const timeoutMs = config.HEARTBEAT_TIMEOUT_SECONDS * 1000;
    const timeSinceHeartbeat = now - instance.lastHeartbeat;
    
    return timeSinceHeartbeat <= timeoutMs && instance.status === 'healthy';
  }

  // Get healthy instance count for a service
  getHealthyInstanceCount(serviceName) {
    if (!this.services.has(serviceName)) {
      return 0;
    }

    const instances = this.services.get(serviceName);
    return instances.filter(instance => this.isInstanceHealthy(instance)).length;
  }

  // Update statistics
  updateStats() {
    this.stats.activeServices = this.services.size;
    this.stats.activeInstances = Array.from(this.services.values())
      .reduce((total, instances) => total + instances.length, 0);
  }

  // Cleanup dead services
  cleanupDeadServices() {
    const now = Date.now();
    const timeoutMs = config.HEARTBEAT_TIMEOUT_SECONDS * 1000;
    let totalCleaned = 0;

    console.log('\n=== Starting service cleanup ===');

    for (const [serviceName, instances] of this.services.entries()) {
      const initialCount = instances.length;
      
      // Filter out dead instances
      const healthyInstances = instances.filter(instance => {
        const timeSinceHeartbeat = now - instance.lastHeartbeat;
        const isHealthy = timeSinceHeartbeat <= timeoutMs && instance.status === 'healthy';
        
        if (!isHealthy) {
          console.log(`Removing dead instance: ${serviceName} at ${instance.ip}:${instance.port} ` +
                     `(last heartbeat: ${Math.round(timeSinceHeartbeat / 1000)}s ago)`);
          totalCleaned++;
        }
        
        return isHealthy;
      });

      // Update service instances
      if (healthyInstances.length === 0) {
        // Remove entire service if no healthy instances
        this.services.delete(serviceName);
        console.log(`Removed service: ${serviceName} (no healthy instances)`);
      } else if (healthyInstances.length !== initialCount) {
        // Update with healthy instances only
        this.services.set(serviceName, healthyInstances);
      }
    }

    if (totalCleaned > 0) {
      this.stats.totalCleanups += totalCleaned;
      console.log(`Cleanup completed: ${totalCleaned} dead instances removed`);
    } else {
      console.log('Cleanup completed: no dead instances found');
    }

    this.updateStats();
    console.log(`Active services: ${this.stats.activeServices}, Active instances: ${this.stats.activeInstances}`);
    console.log('=== Cleanup finished ===\n');
  }

  // Start the cleanup process
  startCleanupProcess() {
    const intervalMs = config.CLEANUP_INTERVAL_SECONDS * 1000;
    
    setInterval(() => {
      try {
        this.cleanupDeadServices();
      } catch (error) {
        console.error('Cleanup process error:', error);
      }
    }, intervalMs);

    console.log(`Cleanup process started: checking every ${config.CLEANUP_INTERVAL_SECONDS} seconds`);
    console.log(`Heartbeat timeout: ${config.HEARTBEAT_TIMEOUT_SECONDS} seconds`);
  }

  // Deregister a specific service instance
  deregisterService(name, ip, port) {
    if (!this.services.has(name)) {
      throw new Error(`Service not found: ${name}`);
    }

    const instances = this.services.get(name);
    const instanceIndex = instances.findIndex(
      inst => inst.ip === ip && inst.port === parseInt(port)
    );

    if (instanceIndex === -1) {
      throw new Error(`Service instance not found: ${name} at ${ip}:${port}`);
    }

    const removedInstance = instances.splice(instanceIndex, 1)[0];
    
    // Remove service if no instances left
    if (instances.length === 0) {
      this.services.delete(name);
    }

    console.log(`Service instance deregistered: ${name} at ${ip}:${port} (${removedInstance.id})`);
    this.updateStats();
    
    return removedInstance;
  }

  // Clear all services (for testing/admin purposes)
  clearRegistry() {
    const serviceCount = this.services.size;
    const instanceCount = this.stats.activeInstances;
    
    this.services.clear();
    this.updateStats();
    
    console.log(`Registry cleared: ${serviceCount} services, ${instanceCount} instances removed`);
    
    return { servicesRemoved: serviceCount, instancesRemoved: instanceCount };
  }
}

module.exports = new ServiceRegistry(); 