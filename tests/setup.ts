/**
 * Vitest Test Setup
 * 
 * This file runs before all tests to configure the test environment.
 */

import { beforeAll, afterAll } from 'vitest';
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://chutea_user:test123@localhost:5432/chutea_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.LOG_LEVEL = 'error';  // Reduce log noise in tests

beforeAll(async () => {
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  console.log('✅ All tests completed');
});
