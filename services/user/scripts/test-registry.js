const axios = require('axios');

class RegistryTester {
  constructor() {
    this.userServiceUrl = 'http://localhost:3001';
    this.registryUrl = 'http://localhost:3100';
  }

  async testUserServiceHealth() {
    try {
      console.log('Testing User Service health...');
      const response = await axios.get(`${this.userServiceUrl}/health`);
      console.log('✅ User Service Health Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ User Service health check failed:', error.message);
      return null;
    }
  }

  async testRegistryStatus() {
    try {
      console.log('\nTesting Service Registry status...');
      const response = await axios.get(`${this.registryUrl}/stats`);
      console.log('✅ Registry Stats:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Registry status check failed:', error.message);
      return null;
    }
  }

  async testUserServiceRegistration() {
    try {
      console.log('\nTesting User Service registration status...');
      const response = await axios.get(`${this.userServiceUrl}/registry-status`);
      console.log('✅ User Service Registry Status:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ User Service registry status check failed:', error.message);
      return null;
    }
  }

  async testServiceResolution() {
    try {
      console.log('\nTesting service resolution...');
      const response = await axios.get(`${this.registryUrl}/resolve/user-service`);
      console.log('✅ Service Resolution:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Service resolution failed:', error.message);
      return null;
    }
  }

  async runFullTest() {
    console.log('='.repeat(60));
    console.log('TESTING USER SERVICE REGISTRY INTEGRATION');
    console.log('='.repeat(60));

    // Test 1: User Service Health
    const healthResult = await this.testUserServiceHealth();
    
    // Test 2: Registry Status
    const registryResult = await this.testRegistryStatus();
    
    // Test 3: User Service Registration Status
    const registrationResult = await this.testUserServiceRegistration();
    
    // Test 4: Service Resolution
    const resolutionResult = await this.testServiceResolution();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'User Service Health', status: healthResult ? '✅ PASS' : '❌ FAIL' },
      { name: 'Registry Status', status: registryResult ? '✅ PASS' : '❌ FAIL' },
      { name: 'Registration Status', status: registrationResult ? '✅ PASS' : '❌ FAIL' },
      { name: 'Service Resolution', status: resolutionResult ? '✅ PASS' : '❌ FAIL' }
    ];

    tests.forEach(test => {
      console.log(`${test.name}: ${test.status}`);
    });

    const allPassed = tests.every(test => test.status.includes('✅'));
    console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
    
    if (allPassed && healthResult && healthResult.registry) {
      console.log('\n📋 Registration Summary:');
      console.log(`- Registry Enabled: ${healthResult.registry.enabled}`);
      console.log(`- Service Registered: ${healthResult.registry.registered}`);
      console.log(`- Heartbeat Active: ${healthResult.registry.heartbeatActive}`);
    }

    console.log('\n📌 Next Steps:');
    console.log('1. Ensure Service Registry is running on port 3100');
    console.log('2. Ensure User Service is running on port 3001');
    console.log('3. Check User Service logs for registration messages');
    console.log('4. Verify REGISTRY_ENABLED=true in .env file');
  }
}

// Run the test if script is executed directly
if (require.main === module) {
  const tester = new RegistryTester();
  tester.runFullTest().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = RegistryTester; 