const axios = require('axios');

class GatewayDNSTester {
  constructor() {
    this.gatewayUrl = 'http://localhost:8080';
    this.dnsServerUrl = 'http://localhost:8600';
    this.registryUrl = 'http://localhost:3100';
  }

  async testGatewayHealth() {
    try {
      console.log('🔍 Testing Gateway health with DNS status...');
      const response = await axios.get(`${this.gatewayUrl}/gateway/health`);
      console.log('✅ Gateway Health Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Gateway health check failed:', error.message);
      return null;
    }
  }

  async testDNSStatus() {
    try {
      console.log('\n🔍 Testing Gateway DNS status...');
      const response = await axios.get(`${this.gatewayUrl}/gateway/dns-status`);
      console.log('✅ DNS Status Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ DNS status check failed:', error.message);
      return null;
    }
  }

  async testDNSCache() {
    try {
      console.log('\n🔍 Testing DNS cache information...');
      const response = await axios.get(`${this.gatewayUrl}/gateway/dns-cache`);
      console.log('✅ DNS Cache Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ DNS cache check failed:', error.message);
      return null;
    }
  }

  async testServiceResolution(serviceName) {
    try {
      console.log(`\n🔍 Testing DNS resolution for ${serviceName}...`);
      const response = await axios.get(`${this.gatewayUrl}/gateway/dns-test/${serviceName}`);
      console.log(`✅ DNS Resolution for ${serviceName}:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`⚠️  Service ${serviceName} not found:`, error.response.data);
        return error.response.data;
      } else {
        console.error(`❌ DNS resolution test failed for ${serviceName}:`, error.message);
        return null;
      }
    }
  }

  async testGatewayStats() {
    try {
      console.log('\n🔍 Testing Gateway statistics with DNS metrics...');
      const response = await axios.get(`${this.gatewayUrl}/gateway/stats`);
      console.log('✅ Gateway Stats Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Gateway stats check failed:', error.message);
      return null;
    }
  }

  async testServiceProxyThroughDNS(serviceName, endpoint = '/health') {
    try {
      console.log(`\n🔍 Testing service proxy through DNS for ${serviceName}${endpoint}...`);
      const response = await axios.get(`${this.gatewayUrl}/${serviceName}${endpoint}`, {
        timeout: 5000
      });
      console.log(`✅ Proxy Response for ${serviceName}:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  Proxy response for ${serviceName}:`, error.response.status, error.response.data);
        return error.response.data;
      } else {
        console.error(`❌ Proxy test failed for ${serviceName}:`, error.message);
        return null;
      }
    }
  }

  async clearDNSCache(serviceName = null) {
    try {
      const url = serviceName 
        ? `${this.gatewayUrl}/gateway/dns-cache?service=${serviceName}`
        : `${this.gatewayUrl}/gateway/dns-cache`;
      
      console.log(`\n🗑️  Clearing DNS cache${serviceName ? ` for ${serviceName}` : ' (all)'}...`);
      const response = await axios.delete(url);
      console.log('✅ Cache Clear Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ DNS cache clear failed:', error.message);
      return null;
    }
  }

  async registerTestService() {
    try {
      console.log('\n📝 Registering test service in registry...');
      const testService = {
        name: 'test-service',
        ip: '127.0.0.1',
        port: 4000,
        metadata: {
          version: '1.0.0',
          environment: 'test'
        }
      };

      const response = await axios.post(`${this.registryUrl}/register`, testService);
      console.log('✅ Test service registered:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Test service registration failed:', error.message);
      return null;
    }
  }

  async runComprehensiveTest() {
    console.log('='.repeat(70));
    console.log('COMPREHENSIVE GATEWAY DNS INTEGRATION TEST');
    console.log('='.repeat(70));

    const results = {};

    // Test 1: Gateway Health with DNS Status
    results.health = await this.testGatewayHealth();
    
    // Test 2: DNS Status
    results.dnsStatus = await this.testDNSStatus();
    
    // Test 3: DNS Cache Info
    results.dnsCache = await this.testDNSCache();
    
    // Test 4: Gateway Statistics
    results.stats = await this.testGatewayStats();
    
    // Test 5: Register a test service
    results.testServiceRegistration = await this.registerTestService();
    
    // Wait a moment for registration to propagate
    if (results.testServiceRegistration) {
      console.log('\n⏳ Waiting 2 seconds for service registration to propagate...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test 6: DNS Resolution Tests
    const servicesToTest = ['user-service', 'test-service', 'nonexistent-service'];
    results.dnsResolution = {};
    
    for (const service of servicesToTest) {
      results.dnsResolution[service] = await this.testServiceResolution(service);
    }
    
    // Test 7: Service Proxy Tests (if services are available)
    results.proxyTests = {};
    const availableServices = Object.keys(results.dnsResolution).filter(
      service => results.dnsResolution[service] && results.dnsResolution[service].resolved
    );
    
    for (const service of availableServices) {
      results.proxyTests[service] = await this.testServiceProxyThroughDNS(service);
    }
    
    // Test 8: DNS Cache Management
    results.cacheManagement = {};
    results.cacheManagement.clearSpecific = await this.clearDNSCache('test-service');
    results.cacheManagement.clearAll = await this.clearDNSCache();
    
    // Test 9: Final DNS Cache State
    results.finalCacheState = await this.testDNSCache();
    
    // Test 10: Final Statistics
    results.finalStats = await this.testGatewayStats();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    
    const tests = [
      { name: 'Gateway Health', status: results.health ? '✅ PASS' : '❌ FAIL' },
      { name: 'DNS Status', status: results.dnsStatus ? '✅ PASS' : '❌ FAIL' },
      { name: 'DNS Cache Info', status: results.dnsCache ? '✅ PASS' : '❌ FAIL' },
      { name: 'Gateway Statistics', status: results.stats ? '✅ PASS' : '❌ FAIL' },
      { name: 'Test Service Registration', status: results.testServiceRegistration ? '✅ PASS' : '❌ FAIL' }
    ];

    // Add DNS resolution test results
    Object.keys(results.dnsResolution).forEach(service => {
      const result = results.dnsResolution[service];
      const expected = service === 'nonexistent-service' ? false : true;
      const actual = result && result.resolved;
      const status = (expected === actual) ? '✅ PASS' : '❌ FAIL';
      tests.push({ name: `DNS Resolution: ${service}`, status });
    });

    tests.forEach(test => {
      console.log(`${test.name}: ${test.status}`);
    });

    const allPassed = tests.every(test => test.status.includes('✅'));
    console.log('\n' + (allPassed ? '🎉 ALL CORE TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
    
    // DNS Connection Summary
    if (results.health && results.health.dns) {
      console.log('\n📋 DNS Connection Summary:');
      console.log(`- DNS Server: ${results.health.dns.server}`);
      console.log(`- Connected: ${results.health.dns.connected}`);
    }

    // Statistics Summary
    if (results.finalStats && results.finalStats.dns) {
      console.log('\n📊 DNS Statistics Summary:');
      console.log(`- Total Queries: ${results.finalStats.dns.queries}`);
      console.log(`- Cache Hits: ${results.finalStats.dns.hits}`);
      console.log(`- Cache Misses: ${results.finalStats.dns.misses}`);
      console.log(`- Errors: ${results.finalStats.dns.errors}`);
      console.log(`- Cache Entries: ${results.finalStats.dns.cache.total}`);
    }

    console.log('\n📌 Next Steps:');
    console.log('1. Ensure DNS Server is running on port 8600');
    console.log('2. Ensure Service Registry is running on port 3100');
    console.log('3. Ensure Gateway is running on port 8080');
    console.log('4. Register real services to test full integration');
    console.log('5. Test actual service proxying through the gateway');

    return results;
  }
}

// Run the test if script is executed directly
if (require.main === module) {
  const tester = new GatewayDNSTester();
  tester.runComprehensiveTest().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = GatewayDNSTester; 