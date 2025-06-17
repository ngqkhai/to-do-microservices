const jwtAuth = require('./jwtAuth');
const dnsResolver = require('../services/dnsResolver');
const proxyService = require('../services/proxyService');

class ProxyMiddleware {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      dnsErrors: 0,
      authErrors: 0,
      proxyErrors: 0
    };
  }

  // Main proxy middleware
  proxy() {
    return async (req, res, next) => {
      const startTime = Date.now();
      this.stats.totalRequests++;

      try {
        // Log incoming request
        console.log(`\n=== Incoming Request ===`);
        console.log(`${req.method} ${req.originalUrl}`);
        console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
        console.log(`User:`, req.user ? req.user.email || req.user.id : 'Anonymous');

        // Parse service name from path (use originalUrl to get the full path)
        const fullPath = req.originalUrl.split('?')[0]; // Remove query parameters
        const { serviceName, remainingPath } = proxyService.parseServiceFromPath(fullPath);
        const serviceHost = `${serviceName}.local`;
        
        console.log(`Service: ${serviceName}`);
        console.log(`Service Host: ${serviceHost}`);
        console.log(`Remaining Path: ${remainingPath}`);

        // Resolve service using DNS
        let serviceInfo;
        try {
          serviceInfo = await dnsResolver.resolveService(serviceHost);
        } catch (dnsError) {
          console.error(`DNS resolution failed for ${serviceHost}:`, dnsError.message);
          this.stats.dnsErrors++;
          this.stats.failedRequests++;
          
          return res.status(503).json({
            error: 'Service Unavailable',
            message: `Cannot resolve service: ${serviceName}`,
            service: serviceName,
            timestamp: new Date().toISOString()
          });
        }

        // Build target URL
        const targetUrl = proxyService.buildTargetUrl(
          serviceInfo.ip, 
          serviceInfo.port, 
          remainingPath
        );

        console.log(`Target URL: ${targetUrl}`);

        // Forward request
        let proxyResponse;
        try {
          proxyResponse = await proxyService.forwardRequest(req, targetUrl);
        } catch (proxyError) {
          console.error(`Proxy failed:`, proxyError.message);
          this.stats.proxyErrors++;
          this.stats.failedRequests++;
          
          return res.status(502).json({
            error: 'Bad Gateway',
            message: proxyError.message,
            service: serviceName,
            targetUrl,
            timestamp: new Date().toISOString()
          });
        }

        // Forward response
        const duration = Date.now() - startTime;
        console.log(`\n=== Response Forwarded ===`);
        console.log(`Status: ${proxyResponse.status}`);
        console.log(`Duration: ${duration}ms`);

        // Set response headers (exclude hop-by-hop headers)
        const responseHeaders = { ...proxyResponse.headers };
        delete responseHeaders['connection'];
        delete responseHeaders['upgrade'];
        delete responseHeaders['transfer-encoding'];

        // Add gateway headers
        responseHeaders['x-gateway-processed'] = 'true';
        responseHeaders['x-gateway-duration'] = `${duration}ms`;
        responseHeaders['x-gateway-service'] = serviceName;
        responseHeaders['x-gateway-request-id'] = proxyResponse.requestId;

        // Set headers
        Object.entries(responseHeaders).forEach(([key, value]) => {
          if (value !== undefined) {
            res.set(key, value);
          }
        });

        // Send response
        res.status(proxyResponse.status);

        if (proxyResponse.data && typeof proxyResponse.data.pipe === 'function') {
          // Stream response
          proxyResponse.data.pipe(res);
        } else {
          // Direct response
          res.send(proxyResponse.data);
        }

        this.stats.successfulRequests++;

      } catch (error) {
        console.error('Gateway error:', error);
        this.stats.failedRequests++;

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'Gateway processing failed',
            timestamp: new Date().toISOString()
          });
        }
      }
    };
  }

  // Middleware with JWT authentication
  authenticatedProxy() {
    return [
      jwtAuth.middleware(),
      jwtAuth.cleanupHeaders(),
      this.proxy()
    ];
  }

  // Middleware with optional JWT authentication
  optionalAuthProxy() {
    return [
      jwtAuth.optionalAuth(),
      jwtAuth.cleanupHeaders(),
      this.proxy()
    ];
  }

  // Get gateway statistics
  getStats() {
    return {
      ...this.stats,
      uptime: process.uptime(),
      activeRequests: proxyService.getActiveRequestsStats(),
      dnsCache: dnsResolver.getCacheStats()
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      dnsErrors: 0,
      authErrors: 0,
      proxyErrors: 0
    };
  }
}

module.exports = new ProxyMiddleware(); 