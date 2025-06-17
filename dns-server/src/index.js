const dnsServer = require('./services/dnsServer');
const config = require('./config/env');

class DNSServerApp {
  constructor() {
    this.displayStartupInfo();
  }

  displayStartupInfo() {
    console.log('\n=== DNS Server for Service Discovery ===');
    console.log(`Version: 1.0.0`);
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`Host: ${config.HOST}`);
    console.log(`Port: ${config.PORT} (UDP)`);
    console.log(`Registry URL: ${config.REGISTRY_URL}`);
    console.log(`Registry Timeout: ${config.REGISTRY_TIMEOUT_MS}ms`);
    console.log(`Default TTL: ${config.DEFAULT_TTL}s`);
    console.log(`Cache TTL: ${config.CACHE_TTL_SECONDS}s`);
    console.log('=======================================\n');
  }

  async start() {
    try {
      console.log('Starting DNS Server...');
      await dnsServer.start();
      
      console.log('\n=== DNS Server Ready ===');
      console.log('The DNS server is now ready to resolve .local domains');
      console.log('through the service registry.');
      console.log('\nUsage Examples:');
      console.log(`  nslookup user-service.local ${config.HOST} -port=${config.PORT}`);
      console.log(`  dig @${config.HOST} -p ${config.PORT} task-service.local`);
      console.log(`  dig @${config.HOST} -p ${config.PORT} notification-service.local`);
      console.log('\nFor testing without a real service:');
      console.log('1. Start the service registry on port 3100');
      console.log('2. Register a test service:');
      console.log('   curl -X POST http://localhost:3100/register \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"name":"test-service","ip":"127.0.0.1","port":4000}\'');
      console.log('3. Test DNS resolution:');
      console.log(`   nslookup test-service.local ${config.HOST} -port=${config.PORT}`);
      console.log('========================\n');

    } catch (error) {
      console.error('Failed to start DNS Server:', error.message);
      console.error('\nTroubleshooting:');
      console.error('1. Make sure the service registry is running on port 3100');
      console.error('2. Check if port 8600 is available (may need sudo on Linux/Mac)');
      console.error('3. Verify network connectivity to the registry');
      process.exit(1);
    }
  }

  // Handle application shutdown
  async stop() {
    console.log('Shutting down DNS Server application...');
    await dnsServer.stop();
    console.log('DNS Server application stopped');
  }
}

// Create and start the DNS server application
const app = new DNSServerApp();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT (Ctrl+C), shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
app.start(); 