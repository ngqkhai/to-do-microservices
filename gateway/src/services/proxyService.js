const axios = require('axios');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');

class ProxyService {
  constructor() {
    this.activeRequests = new Map();
    this.requestTimeout = 15000; // 15 seconds for DELETE operations
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
    // Convert 127.0.0.1 to localhost to avoid IPv4/IPv6 issues
    const host = ip === '127.0.0.1' ? 'localhost' : ip;
    const baseUrl = `http://${host}:${port}`;
    return remainingPath ? `${baseUrl}${remainingPath}` : baseUrl;
  }

  async forwardRequest(req, targetUrl) {
    const requestId = uuidv4();
    
    try {
      console.log(`[${requestId}] Forwarding ${req.method} ${req.originalUrl} -> ${targetUrl}`);
      
      // Try native HTTP first for better reliability
      return await this.forwardWithNativeHttp(req, targetUrl, requestId);
      
    } catch (error) {
      console.error(`[${requestId}] Native HTTP failed, trying axios fallback:`, error.message);
      return await this.forwardWithAxios(req, targetUrl, requestId);
    }
  }

  async forwardWithNativeHttp(req, targetUrl, requestId) {
    return new Promise((resolve, reject) => {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      // Prepare headers
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

      // Prepare request body
      let postData = '';
      if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
        if (req.get('content-type') && req.get('content-type').includes('application/json')) {
          postData = JSON.stringify(req.body);
          forwardHeaders['content-type'] = 'application/json';
          forwardHeaders['content-length'] = Buffer.byteLength(postData);
          console.log(`[${requestId}] Forwarding JSON body:`, postData);
        } else if (req.body) {
          postData = req.body;
          if (req.get('content-type')) {
            forwardHeaders['content-type'] = req.get('content-type');
          }
        }
      } else if (req.method.toUpperCase() === 'DELETE') {
        // DELETE requests typically don't have body, but ensure clean headers
        delete forwardHeaders['content-length'];
        delete forwardHeaders['content-type'];
        console.log(`[${requestId}] DELETE request - no body, cleaned headers`);
      }

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: req.method,
        headers: forwardHeaders,
        timeout: this.requestTimeout
      };

      console.log(`[${requestId}] Making native HTTP request to ${url.hostname}:${options.port}${options.path}`);

      // Track active request
      this.activeRequests.set(requestId, {
        startTime: Date.now(),
        method: req.method,
        originalUrl: req.originalUrl,
        targetUrl
      });

      const proxyReq = httpModule.request(options, (proxyRes) => {
        const duration = Date.now() - this.activeRequests.get(requestId).startTime;
        console.log(`[${requestId}] Response received: ${proxyRes.statusCode} (${duration}ms)`);

        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk;
        });

        proxyRes.on('end', () => {
          this.activeRequests.delete(requestId);
          
          // Parse response body if JSON
          let responseData = body;
          if (body && proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('application/json')) {
            try {
              responseData = JSON.parse(body);
            } catch (e) {
              // Keep as string if not valid JSON
              console.warn(`[${requestId}] Failed to parse JSON response:`, e.message);
            }
          } else if (!body) {
            // For empty responses (like DELETE), set to null
            responseData = null;
          }

          resolve({
            status: proxyRes.statusCode,
            headers: proxyRes.headers,
            data: responseData,
            requestId
          });
        });

        proxyRes.on('error', (error) => {
          console.error(`[${requestId}] Response stream error:`, error.message);
          this.activeRequests.delete(requestId);
          reject(new Error(`Response error: ${error.message}`));
        });
      });

      proxyReq.on('error', (error) => {
        console.error(`[${requestId}] Request error:`, error.message);
        this.activeRequests.delete(requestId);
        reject(new Error(`Connection failed: ${error.message}`));
      });

      proxyReq.on('timeout', () => {
        console.error(`[${requestId}] Request timeout after ${this.requestTimeout}ms`);
        this.activeRequests.delete(requestId);
        proxyReq.destroy();
        reject(new Error(`Request timeout: ${this.requestTimeout}ms exceeded`));
      });

      proxyReq.on('close', () => {
        console.log(`[${requestId}] Request connection closed`);
      });

      // Send request body
      if (postData) {
        proxyReq.write(postData);
      }
      
      // Important: End the request properly
      proxyReq.end();
    });
  }

  async forwardWithAxios(req, targetUrl, requestId) {
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
      validateStatus: () => true // Accept all status codes
      };

      // Add query parameters
      if (Object.keys(req.query).length > 0) {
        axiosConfig.params = req.query;
      }

      // Add request body for POST, PUT, PATCH
      if (['post', 'put', 'patch'].includes(req.method.toLowerCase())) {
        axiosConfig.data = req.body;
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

    try {
      const response = await axios(axiosConfig);

      // Log response
      const duration = Date.now() - this.activeRequests.get(requestId).startTime;
      console.log(`[${requestId}] Axios response received: ${response.status} (${duration}ms)`);

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
      
      console.error(`[${requestId}] Axios error (${duration}ms):`, error.message);
      
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