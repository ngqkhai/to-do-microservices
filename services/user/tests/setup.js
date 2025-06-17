// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_auth_db';
process.env.JWT_PRIVATE_KEY_PATH = 'src/config/keys/private.pem';
process.env.JWT_PUBLIC_KEY_PATH = 'src/config/keys/public.pem';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.PORT = '3001';

// Mock JWT keys for testing
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn((path) => {
    if (path.includes('private.pem')) {
      return `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKB
wQNDAuBcRKYGAwBjELjgBcFKkUTBkAFJGBJFJGBJFJGBJFJGBJFJGBJFJGBJFJG
-----END PRIVATE KEY-----`;
    } else if (path.includes('public.pem')) {
      return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1L7VLPHCgcEDQwL
gXESmBgMAYxC44AXBSpFEwZABSRgSRSRgSRSRgSRSRgSRSRgSRSRgSRSRgSRSRgS
-----END PUBLIC KEY-----`;
    }
    return jest.requireActual('fs').readFileSync(path);
  })
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock RabbitMQ publisher
jest.mock('../src/events/publisher', () => ({
  publishUserRegistered: jest.fn().mockResolvedValue(true),
  publishUserLoggedIn: jest.fn().mockResolvedValue(true),
  publishUserLoggedOut: jest.fn().mockResolvedValue(true),
  connectEventPublisher: jest.fn().mockResolvedValue(true),
  closeEventPublisher: jest.fn().mockResolvedValue(true),
  isEventPublisherHealthy: jest.fn().mockReturnValue(true)
})); 