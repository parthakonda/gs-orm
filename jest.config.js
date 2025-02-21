module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'lib/**/*.js',
      '!**/node_modules/**',
    ],
    coverageReporters: ['text', 'lcov'],
    verbose: true,
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  };