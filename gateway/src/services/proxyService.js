const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class ProxyService {
  constructor() {
    this.activeRequests = new Map();
    this.requestTimeout = 30000; // 30 seconds
  }

  parseServiceFromPath(path) {
    // Extract service name from path: /service-name/... -> service-name
    console.log(`\n=== parseServiceFromPath Debug ===`);
    console.log(`Input path: "${path}"`);

    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    
    if (pathSegments.length === 0) {
      throw new Error('Invalid path: no service specified');
    }

    const serviceName = pathSegments[0];
    const remainingPath = '/' + pathSegments.slice(1).join('/');
    
    return {
      serviceName,
      remainingPath: remainingPath === '/' ? '' : remainingPath
    };
  }

  buildTargetUrl(ip, port, remainingPath) {
    const baseUrl = `http://${ip}:${port}`;
    return remainingPath ? `${baseUrl}${remainingPath}` : baseUrl;
  }

  async forwardRequest(req, targetUrl) {
    const requestId = uuidv4();
    
    try {
      console.log(`[${requestId}] Forwarding ${req.method} ${req.originalUrl} -> ${targetUrl}`);
      
      // Prepare headers (exclude hop-by-hop headers)
      const forwardHeaders = { ...req.headers };
      delete forwardHeaders['host'];
      delete forwardHeaders['connection'];
      delete forwardHeaders['upgrade'];
      delete forwardHeaders['proxy-authorization'];
      delete forwardHeaders['proxy-authenticate'];
      delete forwardHeaders['te'];
      delete forwardHeaders['trailers'];
      delete forwardHeaders['transfer-encoding'];

      // Add forwarded headers for traceability
      forwardHeaders['x-forwarded-for'] = req.ip;
      forwardHeaders['x-forwarded-proto'] = req.protocol;
      forwardHeaders['x-forwarded-host'] = req.get('host');
      forwardHeaders['x-gateway-request-id'] = requestId;

      // Add user info if available
      if (req.user) {
        forwardHeaders['x-user-id'] = req.user.id || req.user.sub;
        forwardHeaders['x-user-email'] = req.user.email;
        forwardHeaders['x-user-roles'] = JSON.stringify(req.user.roles || []);
      }

      const axiosConfig = {
        method: req.method.toLowerCase(),
        url: targetUrl,
        headers: forwardHeaders,
        timeout: this.requestTimeout,
        maxRedirects: 5,
        validateStatus: () => true, // Accept all status codes
        responseType: 'stream' // Stream response for better performance
      };

      // Add query parameters
      if (Object.keys(req.query).length > 0) {
        axiosConfig.params = req.query;
      }

      // Add request body for POST, PUT, PATCH
      if (['post', 'put', 'patch'].includes(req.method.toLowerCase())) {
        axiosConfig.data = req.body;
        
        // Ensure content-type is preserved
        if (req.get('content-type')) {
          axiosConfig.headers['content-type'] = req.get('content-type');
        }
      }

      // Track active request
      this.activeRequests.set(requestId, {
        startTime: Date.now(),
        method: req.method,
        originalUrl: req.originalUrl,
        targetUrl
      });

      const response = await axios(axiosConfig);

      // Log response
      const duration = Date.now() - this.activeRequests.get(requestId).startTime;
      console.log(`[${requestId}] Response received: ${response.status} (${duration}ms)`);

      // Clean up tracking
      this.activeRequests.delete(requestId);

      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
        requestId
      };

    } catch (error) {
      const duration = this.activeRequests.has(requestId) ? 
        Date.now() - this.activeRequests.get(requestId).startTime : 0;
      
      console.error(`[${requestId}] Proxy error (${duration}ms):`, error.message);
      
      // Clean up tracking
      this.activeRequests.delete(requestId);

      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Service unavailable: ${targetUrl}`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Service timeout: ${targetUrl}`);
      } else if (error.response) {
        // Server responded with error status
        return {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
          requestId
        };
      } else {
        throw new Error(`Proxy failed: ${error.message}`);
      }
    }
  }

  getActiveRequestsStats() {
    const now = Date.now();
    const requests = Array.from(this.activeRequests.values()).map(req => ({
      ...req,
      duration: now - req.startTime
    }));

    return {
      count: requests.length,
      requests
    };
  }

  // Clean up old active requests (safety mechanism)
  cleanupStaleRequests() {
    const now = Date.now();
    const maxAge = this.requestTimeout + 5000; // 5 seconds buffer

    for (const [id, request] of this.activeRequests.entries()) {
      if (now - request.startTime > maxAge) {
        console.warn(`Cleaning up stale request ${id}`);
        this.activeRequests.delete(id);
      }
    }
  }
}

module.exports = new ProxyService(); 