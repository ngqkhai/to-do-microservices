const express = require('express');
const serviceRegistry = require('../services/serviceRegistry');
const { 
  validateRegisterService, 
  validateHeartbeat, 
  validateServiceName 
} = require('../middleware/validation');

const router = express.Router();

// POST /register - Register a service instance
router.post('/register', validateRegisterService, async (req, res) => {
  try {
    const { name, ip, port, metadata } = req.body;
    
    console.log(`Registration request: ${name} at ${ip}:${port}`);
    
    const instance = serviceRegistry.registerService(name, ip, port, metadata);
    
    res.status(201).json({
      message: 'Service registered successfully',
      instance: {
        id: instance.id,
        name: instance.name,
        ip: instance.ip,
        port: instance.port,
        status: instance.status,
        registeredAt: new Date(instance.registeredAt).toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({
      error: 'Registration Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /heartbeat - Update service heartbeat
router.post('/heartbeat', validateHeartbeat, async (req, res) => {
  try {
    const { name, ip, port } = req.body;
    
    const instance = serviceRegistry.updateHeartbeat(name, ip, port);
    
    res.status(200).json({
      message: 'Heartbeat updated',
      instance: {
        id: instance.id,
        name: instance.name,
        ip: instance.ip,
        port: instance.port,
        status: instance.status,
        lastHeartbeat: new Date(instance.lastHeartbeat).toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Heartbeat error:', error.message);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Service Not Found',
        message: error.message,
        suggestion: 'Register the service first using POST /register',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        error: 'Heartbeat Failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// GET /resolve/:name - Get healthy instances for a service
router.get('/resolve/:name', validateServiceName, async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log(`Resolution request for: ${name}`);
    
    const instances = serviceRegistry.resolveService(name);
    
    if (instances.length === 0) {
      return res.status(404).json({
        error: 'Service Not Found',
        message: `No healthy instances found for service: ${name}`,
        serviceName: name,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      serviceName: name,
      instanceCount: instances.length,
      instances: instances.map(instance => ({
        id: instance.id,
        ip: instance.ip,
        port: instance.port,
        status: instance.status,
        lastHeartbeat: new Date(instance.lastHeartbeat).toISOString(),
        registeredAt: new Date(instance.registeredAt).toISOString(),
        metadata: instance.metadata
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Resolution error:', error.message);
    res.status(500).json({
      error: 'Resolution Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /services - List all services and instances
router.get('/services', async (req, res) => {
  try {
    console.log('Services list request');
    
    const services = serviceRegistry.getAllServices();
    const serviceNames = Object.keys(services);
    
    // Format response
    const formattedServices = {};
    for (const [serviceName, serviceData] of Object.entries(services)) {
      formattedServices[serviceName] = {
        instanceCount: serviceData.instanceCount,
        healthyCount: serviceData.healthyCount,
        instances: serviceData.instances.map(instance => ({
          id: instance.id,
          ip: instance.ip,
          port: instance.port,
          status: instance.status,
          isHealthy: instance.isHealthy,
          lastHeartbeat: new Date(instance.lastHeartbeat).toISOString(),
          registeredAt: new Date(instance.registeredAt).toISOString(),
          timeSinceHeartbeat: `${Math.round(instance.timeSinceHeartbeat / 1000)}s`,
          metadata: instance.metadata
        }))
      };
    }
    
    res.status(200).json({
      totalServices: serviceNames.length,
      totalInstances: Object.values(services)
        .reduce((sum, service) => sum + service.instanceCount, 0),
      totalHealthyInstances: Object.values(services)
        .reduce((sum, service) => sum + service.healthyCount, 0),
      services: formattedServices,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Services list error:', error.message);
    res.status(500).json({
      error: 'Failed to List Services',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /stats - Get registry statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = serviceRegistry.getStats();
    
    res.status(200).json({
      ...stats,
      heartbeatTimeout: `${require('../config/env').HEARTBEAT_TIMEOUT_SECONDS}s`,
      cleanupInterval: `${require('../config/env').CLEANUP_INTERVAL_SECONDS}s`
    });
    
  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({
      error: 'Failed to Get Statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /services/:name - Deregister all instances of a service
router.delete('/services/:name', validateServiceName, async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log(`Deregistration request for service: ${name}`);
    
    // Get all instances before deletion
    const instances = serviceRegistry.resolveService(name);
    if (instances.length === 0) {
      return res.status(404).json({
        error: 'Service Not Found',
        message: `Service ${name} not found or has no instances`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Deregister all instances
    let deregisteredCount = 0;
    for (const instance of instances) {
      try {
        serviceRegistry.deregisterService(name, instance.ip, instance.port);
        deregisteredCount++;
      } catch (err) {
        console.warn(`Failed to deregister ${name} at ${instance.ip}:${instance.port}:`, err.message);
      }
    }
    
    res.status(200).json({
      message: `Service deregistered`,
      serviceName: name,
      instancesRemoved: deregisteredCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Deregistration error:', error.message);
    res.status(500).json({
      error: 'Deregistration Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /services/:name/instances - Deregister specific service instance
router.delete('/services/:name/instances', validateServiceName, async (req, res) => {
  try {
    const { name } = req.params;
    const { ip, port } = req.query;
    
    if (!ip || !port) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Both ip and port query parameters are required',
        example: `/services/${name}/instances?ip=127.0.0.1&port=3001`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`Deregistration request: ${name} at ${ip}:${port}`);
    
    const removedInstance = serviceRegistry.deregisterService(name, ip, parseInt(port));
    
    res.status(200).json({
      message: 'Service instance deregistered',
      removedInstance: {
        id: removedInstance.id,
        name: removedInstance.name,
        ip: removedInstance.ip,
        port: removedInstance.port
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Instance deregistration error:', error.message);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Instance Not Found',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Deregistration Failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// POST /admin/clear - Clear entire registry (admin endpoint)
router.post('/admin/clear', async (req, res) => {
  try {
    console.log('Registry clear request');
    
    const result = serviceRegistry.clearRegistry();
    
    res.status(200).json({
      message: 'Registry cleared successfully',
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Clear registry error:', error.message);
    res.status(500).json({
      error: 'Failed to Clear Registry',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 