module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': '@swc/jest',
  },
  collectCoverageFrom: ['<rootDir>/src/**/*.*'],
};
