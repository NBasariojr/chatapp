// Global test setup — runs before every test suite
import { validateTestEnvironment } from '../../config/env';

// Validate test environment first - fail fast if configuration is missing
validateTestEnvironment();

// Silence console output during tests unless explicitly needed
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});