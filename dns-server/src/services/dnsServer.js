const dns2 = require('dns2');
const registryClient = require('./registryClient');
const config = require('../config/env');

class DNSServer {
  constructor() {
    this.server = null;
    this.stats = {
      totalQueries: 0,
      localQueries: 0,
      resolvedQueries: 0,
      nxdomainQueries: 0,
      errorQueries: 0
    };
    this.startTime = Date.now();
    console.log('DNS Server initialized');
  }

  // Extract service name from .local domain
  extractServiceName(domain) {
    if (!domain.endsWith('.local')) {
      return null;
    }
    
    // Remove .local suffix and return service name
    return domain.slice(0, -6); // Remove '.local'
  }

  // Create DNS response for successful A record
  createARecord(domain, ip, ttl = config.DEFAULT_TTL) {
    return {
      name: domain,
      type: dns2.Packet.TYPE.A,
      class: dns2.Packet.CLASS.IN,
      ttl: ttl,
      address: ip
    };
  }

  // Handle DNS query
  async handleQuery(request, send) {
    const startTime = Date.now();
    this.stats.totalQueries++;

    // Extract query information
    const question = request.questions[0];
    const domain = question.name;
    const queryType = question.type;

    if (config.LOG_DNS_QUERIES) {
      console.log(`DNS Query: ${domain} (${dns2.Packet.TYPE[queryType] || queryType})`);
    }

    try {
      // Handle A record and TXT record queries for .local domains
      if (queryType !== dns2.Packet.TYPE.A && queryType !== dns2.Packet.TYPE.TXT) {
        if (config.LOG_DNS_QUERIES) {
          console.log(`Unsupported query type: ${dns2.Packet.TYPE[queryType] || queryType}`);
        }
        this.stats.errorQueries++;
        // Send NOTIMP (4) for unsupported query types
        const response = dns2.Packet.createResponseFromRequest(request);
        response.header.rcode = 4; // NOTIMP
        send(response);
        return;
      }

      // Check if it's a .local domain
      const serviceName = this.extractServiceName(domain);
      if (!serviceName) {
        if (config.LOG_DNS_QUERIES) {
          console.log(`Non-.local domain, ignoring: ${domain}`);
        }
        this.stats.errorQueries++;
        return this.sendNXDOMAIN(request, send, domain, 'Non-.local domain');
      }

      this.stats.localQueries++;

      if (config.LOG_DNS_QUERIES) {
        console.log(`Service name extracted: ${serviceName}`);
      }

      // Query service registry for healthy instances
      const instances = await registryClient.resolveService(serviceName);
      
      console.log(`🔍 Registry Response Debug:`, {
        serviceName,
        instances: instances,
        instanceCount: instances ? instances.length : 0,
        firstInstance: instances && instances.length > 0 ? instances[0] : null
      });
      
      if (!instances || instances.length === 0) {
        if (config.LOG_DNS_QUERIES) {
          console.log(`No healthy instances found for service: ${serviceName}`);
        }
        this.stats.nxdomainQueries++;
        return this.sendNXDOMAIN(request, send, domain, 'No healthy instances');
      }

      // Get random healthy IP
      const randomIP = registryClient.getRandomHealthyIP(instances);
      
      console.log(`🔍 Random IP Debug:`, {
        serviceName,
        randomIP,
        instancesLength: instances.length
      });
      
      if (!randomIP) {
        if (config.LOG_DNS_QUERIES) {
          console.log(`No valid IP addresses found for service: ${serviceName}`);
        }
        this.stats.nxdomainQueries++;
        return this.sendNXDOMAIN(request, send, domain, 'No valid IP addresses');
      }

      // Create response based on query type
      const response = dns2.Packet.createResponseFromRequest(request);

      if (queryType === dns2.Packet.TYPE.A) {
        // A record response
        response.answers.push({
          name: domain,
          type: dns2.Packet.TYPE.A,
          class: dns2.Packet.CLASS.IN,
          ttl: config.DEFAULT_TTL,
          address: randomIP
        });
      } else if (queryType === dns2.Packet.TYPE.TXT) {
        // TXT record response with port information
        const instance = instances.find(inst => inst.ip === randomIP);
        const port = instance?.port || config.DEFAULT_SERVICE_PORT;
        
        response.answers.push({
          name: domain,
          type: dns2.Packet.TYPE.TXT,
          class: dns2.Packet.CLASS.IN,
          ttl: config.DEFAULT_TTL,
          data: [`port=${port}`]
        });
      }

      // Send successful response
      send(response);
      this.stats.resolvedQueries++;

      const duration = Date.now() - startTime;
      console.log(`DNS Resolved: ${domain} → ${randomIP} (${duration}ms)`);

    } catch (error) {
      console.error(`DNS error for ${domain}:`, error.message);
      this.stats.errorQueries++;
      this.sendNXDOMAIN(request, send, domain, `Internal error: ${error.message}`);
    }
  }

  // Send NXDOMAIN response
  sendNXDOMAIN(request, send, domain, reason) {
    const response = dns2.Packet.createResponseFromRequest(request);
    // Use the correct RCODE for NXDOMAIN (3)
    response.header.rcode = 3; // NXDOMAIN
    
    send(response);

    if (config.LOG_DNS_QUERIES) {
      console.log(`DNS NXDOMAIN: ${domain} (${reason})`);
    }
  }

  // Start the DNS server
  async start() {
    try {
      // Test registry connection first
      console.log('Testing service registry connection...');
      await registryClient.testConnection();

      // Create DNS server using correct dns2 syntax
      this.server = dns2.createServer({
        udp: true,
        handle: (request, send, rinfo) => {
          this.handleQuery(request, send, rinfo);
        }
      });

      // Start listening
      this.server.listen({
        udp: {
          port: config.PORT,
          address: config.HOST,
          type: 'udp4'  // Explicitly specify UDP IPv4
        }
      });

      console.log(`DNS Server started on ${config.HOST}:${config.PORT} (UDP)`);
      console.log(`Registry: ${config.REGISTRY_URL}`);
      console.log('Test: nslookup user-service.local 127.0.0.1 -port=8600');

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start periodic stats logging
      this.startStatsLogging();

    } catch (error) {
      console.error('Failed to start DNS server:', error);
      throw error;
    }
  }

  // Stop the DNS server
  async stop() {
    if (this.server) {
      console.log('Stopping DNS server...');
      await new Promise((resolve) => {
        this.server.close(() => {
          console.log('DNS server stopped');
          resolve();
        });
      });
    }
  }

  // Get server statistics
  getStats() {
    const uptime = Date.now() - this.startTime;
    const cacheStats = registryClient.getCacheStats();

    return {
      ...this.stats,
      uptime: Math.round(uptime / 1000),
      successRate: this.stats.totalQueries > 0 ? 
        (this.stats.resolvedQueries / this.stats.totalQueries * 100).toFixed(2) + '%' : '0%',
      cache: cacheStats,
      timestamp: new Date().toISOString()
    };
  }

  // Setup graceful shutdown
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down...`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('Shutdown error:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  // Start periodic stats logging
  startStatsLogging() {
    setInterval(() => {
      const stats = this.getStats();
      console.log(`DNS Stats: ${stats.totalQueries} queries, ${stats.resolvedQueries} resolved, ${stats.successRate} success rate`);
    }, 60000); // Every minute
  }

  // Clear registry cache
  clearCache(serviceName) {
    registryClient.clearCache(serviceName);
  }
}

module.exports = new DNSServer(); 