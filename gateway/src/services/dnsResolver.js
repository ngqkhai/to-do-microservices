const dns2 = require('dns2');
const config = require('../config/env');

class DNSResolver {
  constructor() {
    // Configure DNS client to use our custom DNS server using UDPClient
    const { UDPClient } = dns2;
    this.client = UDPClient({
      dns: config.DNS_SERVER_HOST,
      port: config.DNS_SERVER_PORT
    });

    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    this.stats = {
      queries: 0,
      hits: 0,
      misses: 0,
      errors: 0
    };

    console.log(`DNS Resolver initialized with server: ${config.DNS_SERVER_HOST}:${config.DNS_SERVER_PORT}`);
  }

  // Normalize service name to .local domain format
  normalizeServiceName(serviceName) {
    // Remove any existing .local suffix and add it back
    const cleanName = serviceName.replace(/\.local$/, '');
    return `${cleanName}.local`;
  }

  async resolveService(serviceName) {
    this.stats.queries++;
    
    // Normalize service name to .local domain
    const localDomain = this.normalizeServiceName(serviceName);
    const cacheKey = localDomain;
    const cached = this.cache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log(`🎯 DNS cache hit for ${serviceName} -> ${cached.ip}:${cached.port}`);
      this.stats.hits++;
      return cached;
    }

    try {
      console.log(`🔍 Resolving DNS for ${serviceName} (${localDomain})`);
      
      // Query A record for IP address from our custom DNS server
      const response = await this.client(localDomain, 'A');
      
      console.log(`🔍 DNS Response Debug:`, {
        domain: localDomain,
        response: response,
        responseType: typeof response,
        answers: response.answers || []
      });
      
      if (!response.answers || response.answers.length === 0) {
        throw new Error(`No A records found for ${localDomain}`);
      }

      // Get the IP address from the first A record
      const answer = response.answers[0];
      const ip = answer.address;
      
      if (!ip) {
        throw new Error(`DNS response contains undefined IP for ${localDomain}`);
      }
      
      // For our microservices, we'll extract port from service registry
      // The custom DNS server should provide this information
      let port = config.DEFAULT_SERVICE_PORT;
      
      // Try to get additional information from TXT records if available
      try {
        const txtResponse = await this.client(localDomain, 'TXT');
        console.log(`🔍 TXT Response Debug:`, {
          domain: localDomain,
          response: txtResponse,
          answers: txtResponse?.answers || []
        });
        
        if (txtResponse?.answers?.length > 0) {
          // Parse TXT record for port information
          const txtData = txtResponse.answers[0].data; // Get the data directly
          console.log(`🔍 TXT Data:`, { txtData });
          
          // Handle both string and array data formats
          const portString = Array.isArray(txtData) ? txtData[0] : txtData;
          const portMatch = portString.match(/port=(\d+)/);
          
          if (portMatch) {
            port = parseInt(portMatch[1]);
            console.log(`🔍 Extracted port from TXT:`, { port });
          }
        }
      } catch (txtError) {
        // TXT records are optional, continue with default port
        console.log(`No TXT record found for ${localDomain}, using default port ${port}`);
      }

      const result = {
        ip,
        port,
        serviceName: serviceName,
        resolvedDomain: localDomain,
        timestamp: Date.now(),
        ttl: answer.ttl || 30 // Use TTL from DNS response or default to 30s
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      this.stats.misses++;
      
      console.log(`✅ DNS resolved ${serviceName} -> ${ip}:${port} (TTL: ${result.ttl}s)`);
      
      return result;
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ DNS resolution failed for ${serviceName} (${localDomain}):`, error.message);
      
      // Try to use cached result even if expired as fallback
      if (cached) {
        console.log(`⚠️  Using expired cache for ${serviceName}: ${cached.ip}:${cached.port}`);
        return cached;
      }
      
      // If DNS resolution fails, this might indicate the service is not registered
      // or the DNS server is not available
      const errorMessage = error.code === 'ENOTFOUND' || error.code === 'ENODATA' 
        ? `Service '${serviceName}' not found in service registry`
        : `DNS server unavailable: ${error.message}`;
        
      throw new Error(errorMessage);
    }
  }

  // Test DNS server connectivity
  async testDNSConnection() {
    try {
      console.log(`Testing DNS server connection to ${config.DNS_SERVER_HOST}:${config.DNS_SERVER_PORT}...`);
      
      // Try to resolve a test domain with timeout
      const testDomain = 'user-service.local';
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('DNS connection test timed out after 5 seconds')), 5000);
      });
      
      const dnsPromise = this.client(testDomain, 'A');
      
      // Race between DNS resolution and timeout
      await Promise.race([dnsPromise, timeoutPromise]);
      
      console.log('✅ DNS server connection test successful');
      return true;
    } catch (error) {
      console.error('❌ DNS server connection test failed:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('DNS server is not running or not accessible');
      } else if (error.code === 'ETIMEOUT' || error.message.includes('timed out')) {
        console.error('DNS server connection timed out');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        console.log('⚠️  DNS server is accessible but test domain not found (this is expected)');
        return true; // DNS server is working, just the test domain doesn't exist
      }
      
      return false;
    }
  }

  // Resolve multiple services in parallel
  async resolveServices(serviceNames) {
    const promises = serviceNames.map(name => 
      this.resolveService(name).catch(error => ({ error: error.message, serviceName: name }))
    );
    
    const results = await Promise.all(promises);
    return results;
  }

  // Clear cache for a specific service
  clearCache(serviceName) {
    const localDomain = this.normalizeServiceName(serviceName);
    const deleted = this.cache.delete(localDomain);
    if (deleted) {
      console.log(`🗑️  Cleared DNS cache for ${serviceName}`);
    }
    return deleted;
  }

  // Clear entire cache
  clearAllCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️  Cleared entire DNS cache (${size} entries)`);
    return size;
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) >= this.cacheTimeout) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🗑️  Cleared ${cleared} expired DNS cache entries`);
    }
    
    return cleared;
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    const stats = {
      total: this.cache.size,
      valid: 0,
      expired: 0,
      entries: []
    };

    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      const isValid = age < this.cacheTimeout;
      
      if (isValid) {
        stats.valid++;
      } else {
        stats.expired++;
      }
      
      stats.entries.push({
        domain: key,
        ip: value.ip,
        port: value.port,
        age: Math.round(age / 1000),
        valid: isValid,
        ttl: value.ttl
      });
    }

    return stats;
  }

  // Get resolver statistics
  getStats() {
    return {
      ...this.stats,
      cache: this.getCacheStats(),
      dnsServer: {
        host: config.DNS_SERVER_HOST,
        port: config.DNS_SERVER_PORT
      }
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      queries: 0,
      hits: 0,
      misses: 0,
      errors: 0
    };
  }

  // Periodic cache cleanup
  startCacheCleanup(intervalMs = 60000) { // Default: 1 minute
    setInterval(() => {
      this.clearExpiredCache();
    }, intervalMs);
    
    console.log(`🔄 Started DNS cache cleanup (every ${intervalMs/1000}s)`);
  }
}

module.exports = new DNSResolver(); 