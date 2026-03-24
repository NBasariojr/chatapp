import type { Config } from 'jest';

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

const config: Config = {
  // Use ts-jest to compile TypeScript test files
  preset: 'ts-jest',

  // Node environment — no DOM needed for backend tests
  testEnvironment: 'node',

  // Where to find tests
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],

  // Module resolution — mirrors tsconfig paths
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Setup file that runs before each test suite
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/helpers/setup.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/controllers/**/*.ts',
    'src/middlewares/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov'],

  // ts-jest configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
    }],
  },

  // Clear mocks between tests automatically
  clearMocks: true,
  restoreMocks: true,
};

export default config;