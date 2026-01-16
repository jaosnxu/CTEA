/**
 * Mock OAuth Server for Internal Testing
 *
 * This server mocks the OAuth endpoints required by the CTEA application.
 * It simulates the OAuth flow without requiring a real OAuth provider.
 *
 * DO NOT USE IN PRODUCTION - FOR TESTING ONLY
 */

const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Mock user data
const MOCK_USERS = {
  "test-user-1": {
    openId: "test-open-id-001",
    name: "Test User 1",
    email: "testuser1@example.com",
    platform: "email",
    platforms: ["REGISTERED_PLATFORM_EMAIL"],
  },
  "test-user-2": {
    openId: "test-open-id-002",
    name: "Test User 2",
    email: "testuser2@example.com",
    platform: "google",
    platforms: ["REGISTERED_PLATFORM_GOOGLE"],
  },
};

// Mock access tokens storage (code -> token mapping)
const tokenStore = new Map();
let tokenCounter = 1000;

/**
 * Mock endpoint: ExchangeToken
 * Exchanges authorization code for access token
 */
app.post("/webdev.v1.WebDevAuthPublicService/ExchangeToken", (req, res) => {
  const { clientId, grantType, code, redirectUri } = req.body;

  console.log("[Mock OAuth] ExchangeToken called:", {
    clientId,
    grantType,
    code,
    redirectUri,
  });

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  // Generate a mock access token
  const accessToken = `mock-access-token-${tokenCounter++}`;
  const refreshToken = `mock-refresh-token-${tokenCounter++}`;

  // Store which user this token belongs to (default to test-user-1)
  const userId = code.includes("user-2") ? "test-user-2" : "test-user-1";
  tokenStore.set(accessToken, userId);

  const response = {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    tokenType: "Bearer",
  };

  console.log("[Mock OAuth] ExchangeToken response:", response);
  res.json(response);
});

/**
 * Mock endpoint: GetUserInfo
 * Returns user information for a given access token
 */
app.post("/webdev.v1.WebDevAuthPublicService/GetUserInfo", (req, res) => {
  const { accessToken } = req.body;

  console.log("[Mock OAuth] GetUserInfo called with token:", accessToken);

  if (!accessToken) {
    return res.status(400).json({ error: "Missing access token" });
  }

  // Look up which user this token belongs to
  const userId = tokenStore.get(accessToken) || "test-user-1";
  const userInfo = MOCK_USERS[userId];

  console.log("[Mock OAuth] GetUserInfo response:", userInfo);
  res.json(userInfo);
});

/**
 * Mock endpoint: GetUserInfoWithJwt
 * Returns user information for a given JWT token
 */
app.post(
  "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt",
  (req, res) => {
    const { jwtToken, projectId } = req.body;

    console.log("[Mock OAuth] GetUserInfoWithJwt called:", {
      jwtToken,
      projectId,
    });

    if (!jwtToken) {
      return res.status(400).json({ error: "Missing JWT token" });
    }

    // Return mock user data (default to test-user-1)
    const userInfo = MOCK_USERS["test-user-1"];

    console.log("[Mock OAuth] GetUserInfoWithJwt response:", userInfo);
    res.json(userInfo);
  }
);

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mock-oauth-server",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Root endpoint with information
 */
app.get("/", (req, res) => {
  res.json({
    service: "Mock OAuth Server",
    version: "1.0.0",
    endpoints: [
      "POST /webdev.v1.WebDevAuthPublicService/ExchangeToken",
      "POST /webdev.v1.WebDevAuthPublicService/GetUserInfo",
      "POST /webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt",
      "GET /health",
    ],
    note: "FOR TESTING ONLY - DO NOT USE IN PRODUCTION",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Mock OAuth Server running on port ${PORT}`);
  console.log("Available endpoints:");
  console.log("  POST /webdev.v1.WebDevAuthPublicService/ExchangeToken");
  console.log("  POST /webdev.v1.WebDevAuthPublicService/GetUserInfo");
  console.log("  POST /webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt");
  console.log("  GET /health");
});
