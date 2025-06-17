const express = require('express');
const proxyMiddleware = require('../middleware/proxyMiddleware');
const dnsResolver = require('../services/dnsResolver');

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test DNS connectivity
    const dnsConnected = await dnsResolver.testDNSConnection();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
      uptime: process.uptime(),
      dns: {
        connected: dnsConnected,
        server: `${require('../config/env').DNS_SERVER_HOST}:${require('../config/env').DNS_SERVER_PORT}`
      }
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
      uptime: process.uptime(),
      dns: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Gateway statistics
router.get('/stats', (req, res) => {
  try {
    const proxyStats = proxyMiddleware.getStats();
    const dnsStats = dnsResolver.getStats();
    
    res.status(200).json({
      proxy: proxyStats,
      dns: dnsStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
});

// DNS cache management
router.delete('/dns-cache', (req, res) => {
  try {
    const { service } = req.query;
    
    if (service) {
      dnsResolver.clearCache(service);
      res.status(200).json({
        message: `DNS cache cleared for service: ${service}`,
        timestamp: new Date().toISOString()
      });
    } else {
      dnsResolver.clearAllCache();
      res.status(200).json({
        message: 'All DNS cache cleared',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear DNS cache',
      message: error.message
    });
  }
});

// Reset gateway statistics
router.delete('/stats', (req, res) => {
  try {
    proxyMiddleware.resetStats();
    res.status(200).json({
      message: 'Gateway statistics reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset statistics',
      message: error.message
    });
  }
});

// DNS cache info
router.get('/dns-cache', (req, res) => {
  try {
    const cacheStats = dnsResolver.getCacheStats();
    res.status(200).json({
      ...cacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve DNS cache info',
      message: error.message
    });
  }
});

// DNS status and configuration
router.get('/dns-status', async (req, res) => {
  try {
    const config = require('../config/env');
    const dnsStats = dnsResolver.getStats();
    const isConnected = await dnsResolver.testDNSConnection();
    
    res.status(200).json({
      server: {
        host: config.DNS_SERVER_HOST,
        port: config.DNS_SERVER_PORT,
        connected: isConnected
      },
      statistics: dnsStats,
      configuration: {
        cacheTimeout: '30 seconds',
        cleanupInterval: '60 seconds',
        queryTimeout: '3 seconds',
        retries: 2
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve DNS status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test DNS resolution for a specific service
router.get('/dns-test/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const startTime = Date.now();
    
    const result = await dnsResolver.resolveService(serviceName);
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      serviceName,
      resolved: true,
      result,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - Date.now();
    res.status(404).json({
      serviceName: req.params.serviceName,
      resolved: false,
      error: error.message,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// Gateway info
router.get('/info', (req, res) => {
  res.status(200).json({
    service: 'API Gateway',
    version: '1.0.0',
    description: 'Node.js Express API Gateway with JWT validation and DNS-based service discovery',
    features: [
      'JWT Authentication',
      'DNS-based Service Discovery',
      'Request Proxying',
      'Request Logging',
      'Statistics Tracking',
      'DNS Caching'
    ],
    endpoints: {
      health: '/gateway/health',
      stats: '/gateway/stats',
      info: '/gateway/info',
      'dns-cache': '/gateway/dns-cache',
      'dns-status': '/gateway/dns-status',
      'dns-test': '/gateway/dns-test/:serviceName'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 