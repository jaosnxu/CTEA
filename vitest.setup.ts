/**
 * Vitest Setup File
 *
 * Sets up test environment variables before tests run.
 * This prevents ZodError from server/_core/env.ts validation.
 */

// Set required environment variables for testing
process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.DATABASE_URL = "mysql://test:test@localhost:3306/test";
process.env.API_KEY = "test-api-key";
process.env.OAUTH_CLIENT_ID = "test-oauth-client-id";
process.env.OAUTH_CLIENT_SECRET = "test-oauth-client-secret";
process.env.OAUTH_CALLBACK_URL = "http://localhost:3000/auth/callback";
process.env.OAUTH_SERVER_URL = "http://localhost:3000/oauth";
process.env.VITE_APP_ID = "test-app-id";
process.env.COOKIE_SECRET = "test-cookie-secret-at-least-32-chars";
