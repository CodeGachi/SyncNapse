/**
 * E2E Test Setup
 * 
 * This file runs before each E2E test suite.
 * It sets up environment variables and any global test configuration.
 */
import { beforeAll, afterAll, jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';
process.env.JWT_ACCESS_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';

// Mock external services if not available
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set. Some E2E tests may be skipped.');
}

if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  process.env.LIVEBLOCKS_SECRET_KEY = 'sk_test_placeholder';
}

if (!process.env.GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:4000/api/auth/google/callback';
}

// Increase timeout for E2E tests (database operations may be slow)
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('[E2E Setup] Starting E2E test suite...');
});

// Global teardown
afterAll(async () => {
  console.log('[E2E Setup] E2E test suite completed.');
});

