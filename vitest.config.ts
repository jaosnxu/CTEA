import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      API_KEY: "test-api-key",
      OAUTH_CLIENT_ID: "test-oauth-client-id",
      OAUTH_CLIENT_SECRET: "test-oauth-client-secret",
      OAUTH_CALLBACK_URL: "http://localhost:3000/callback",
      OAUTH_SERVER_URL: "http://localhost:3000/oauth",
      VITE_APP_ID: "test-app-id",
      COOKIE_SECRET: "test-cookie-secret",
    },
  },
});
