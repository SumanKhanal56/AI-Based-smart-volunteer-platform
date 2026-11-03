// This file tells Jest where the separate evaluation tests are stored.
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  roots: ['<rootDir>/evaluation'],
  testMatch: ['**/*.test.js'],
  // Tests are outside server, so use the backend's installed packages.
  modulePaths: ['<rootDir>/server/node_modules'],
  transform: {},
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  coverageDirectory: '<rootDir>/evaluation/coverage',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/server/src/**/*.js',
    '<rootDir>/client/src/data/**/*.js',
    '!<rootDir>/server/src/server.js',
    '!<rootDir>/server/src/scripts/**'
  ]
};
