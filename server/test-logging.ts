/**
 * Logging System Test
 *
 * Tests the logging functionality to ensure it works correctly
 */

import { createLogger, defaultLogger } from "./src/utils/logger";

async function testLogging() {
  console.log("=== Testing CTEA Logging System ===\n");

  // Test 1: Default logger
  console.log("Test 1: Default logger");
  defaultLogger.info("This is an info message");
  defaultLogger.warn("This is a warning message");
  defaultLogger.error("This is an error message");
  defaultLogger.debug("This is a debug message");
  console.log("✓ Default logger test passed\n");

  // Test 2: Context logger
  console.log("Test 2: Context logger");
  const authLogger = createLogger("Authentication");
  authLogger.info("User authentication started", { userId: "test-123" });
  authLogger.warn("Invalid credentials attempt", { attempts: 3 });
  authLogger.error("Authentication failed", new Error("Invalid token"), {
    userId: "test-123",
  });
  console.log("✓ Context logger test passed\n");

  // Test 3: Request context logger
  console.log("Test 3: Request context logger");
  const requestLogger = authLogger.withRequest("req-abc-123", "user-456");
  requestLogger.info("Processing request", { endpoint: "/api/users" });
  requestLogger.debug("Request details", {
    method: "GET",
    params: { id: "456" },
  });
  console.log("✓ Request context logger test passed\n");

  // Test 4: Child logger
  console.log("Test 4: Child logger");
  const dbLogger = createLogger("Database");
  const queryLogger = dbLogger.child("Query");
  queryLogger.info("Executing query", {
    sql: "SELECT * FROM users WHERE id = ?",
    params: ["123"],
  });
  queryLogger.debug("Query completed", { rows: 1, duration: "15ms" });
  console.log("✓ Child logger test passed\n");

  // Test 5: Error logging with stack trace
  console.log("Test 5: Error logging with stack trace");
  const errorLogger = createLogger("ErrorHandler");
  try {
    throw new Error("Test error for logging");
  } catch (error) {
    errorLogger.error("Caught an error", error as Error, {
      source: "test",
      severity: "high",
    });
  }
  console.log("✓ Error logging test passed\n");

  // Test 6: HTTP logger
  console.log("Test 6: HTTP logger");
  const httpLogger = createLogger("HTTP");
  httpLogger.http("Incoming request", {
    method: "POST",
    url: "/api/orders",
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0",
  });
  console.log("✓ HTTP logger test passed\n");

  console.log("=== All logging tests passed! ===\n");
  console.log("Check the logs directory for file-based logs.");
  console.log(
    "Note: File logs are only created in production mode or for error level.\n"
  );
}

// Run tests
testLogging().catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});
