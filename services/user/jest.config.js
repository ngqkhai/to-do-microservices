module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/migrations/**',
    '!src/config/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  testTimeout: 10000
}; 