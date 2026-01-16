/**
 * Integration tests for OAuth callback processing
 */

import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import axios from "axios";
import type { Request, Response } from "express";
import { SignJWT } from "jose";

// Set up environment variables before any imports
beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3000";
  process.env.DATABASE_URL = "mysql://test:test@localhost:3306/test";
  process.env.API_KEY = "test-api-key";
  process.env.OAUTH_CLIENT_ID = "test-client-id";
  process.env.OAUTH_CLIENT_SECRET = "test-client-secret";
  process.env.OAUTH_CALLBACK_URL = "http://localhost:3000/oauth/callback";
  process.env.OAUTH_TOKEN_URL = "https://oauth.provider.com/token";
});

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("OAuth Callback Processing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Helper to create a mock Express request
   */
  function createMockRequest(query: Record<string, string>): Request {
    return {
      query,
    } as Request;
  }

  /**
   * Helper to create a mock Express response
   */
  function createMockResponse() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  }

  /**
   * Helper to create a valid ID token (JWT)
   */
  async function createIdToken(
    payload: Record<string, unknown>
  ): Promise<string> {
    const secret = new TextEncoder().encode("test-secret");
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime("1h")
      .sign(secret);
  }

  describe("Environment Variable Validation", () => {
    it("should return 500 when OAUTH_CLIENT_ID is not set", async () => {
      const originalValue = process.env.OAUTH_CLIENT_ID;
      delete process.env.OAUTH_CLIENT_ID;

      // Force re-import to pick up changed env
      vi.resetModules();
      const { registerStandardOAuthRoutes } = await import("./auth");

      const app = { get: vi.fn() } as any;
      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth not configured",
        })
      );

      // Restore and reload
      process.env.OAUTH_CLIENT_ID = originalValue;
      vi.resetModules();
    });

    it("should return 500 when OAUTH_CLIENT_SECRET is not set", async () => {
      const originalValue = process.env.OAUTH_CLIENT_SECRET;
      delete process.env.OAUTH_CLIENT_SECRET;

      vi.resetModules();
      const { registerStandardOAuthRoutes } = await import("./auth");

      const app = { get: vi.fn() } as any;
      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth not configured",
        })
      );

      // Restore and reload
      process.env.OAUTH_CLIENT_SECRET = originalValue;
      vi.resetModules();
    });

    it("should return 500 when OAUTH_CALLBACK_URL is not set", async () => {
      const originalValue = process.env.OAUTH_CALLBACK_URL;
      delete process.env.OAUTH_CALLBACK_URL;

      vi.resetModules();
      const { registerStandardOAuthRoutes } = await import("./auth");

      const app = { get: vi.fn() } as any;
      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth not configured",
        })
      );

      // Restore and reload
      process.env.OAUTH_CALLBACK_URL = originalValue;
      vi.resetModules();
    });
  });

  describe("Query Parameter Validation", () => {
    it("should return 400 when code parameter is missing", async () => {
      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Missing authorization code",
        })
      );
    });

    it("should return 400 when state parameter is missing", async () => {
      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Missing state parameter",
        })
      );
    });
  });

  describe("Token Exchange", () => {
    it("should successfully exchange code for tokens", async () => {
      const idToken = await createIdToken({
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test-access-token",
          id_token: idToken,
          token_type: "Bearer",
          expires_in: 3600,
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://oauth.provider.com/token",
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      );
      expect(res.redirect).toHaveBeenCalledWith(302, "/?oauth=success");
    });

    it("should return 500 when token exchange fails", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            error_description: "Invalid authorization code",
          },
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({
        code: "invalid-code",
        state: "test-state",
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth callback failed",
        })
      );
    });

    it("should return 500 when no ID token is received", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "No ID token received",
        })
      );
    });
  });

  describe("ID Token Decoding", () => {
    it("should successfully decode valid ID token with user information", async () => {
      const idToken = await createIdToken({
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/photo.jpg",
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test-access-token",
          id_token: idToken,
          token_type: "Bearer",
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, "/?oauth=success");
    });

    it("should return 500 when ID token is missing required sub field", async () => {
      // Create invalid token without 'sub' field
      const invalidIdToken = await createIdToken({
        email: "test@example.com",
        name: "Test User",
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test-access-token",
          id_token: invalidIdToken,
          token_type: "Bearer",
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth callback failed",
          message: "Invalid ID token",
        })
      );
    });

    it("should handle ID token with minimal required fields", async () => {
      const idToken = await createIdToken({
        sub: "user-456",
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test-access-token",
          id_token: idToken,
          token_type: "Bearer",
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, "/?oauth=success");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth callback failed",
        })
      );
    });

    it("should handle malformed ID token", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test-access-token",
          id_token: "not-a-valid-jwt",
          token_type: "Bearer",
        },
      });

      const { registerStandardOAuthRoutes } = await import("./auth");
      const app = { get: vi.fn() } as any;

      registerStandardOAuthRoutes(app);
      const handler = app.get.mock.calls[0][1];
      const req = createMockRequest({ code: "test-code", state: "test-state" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "OAuth callback failed",
        })
      );
    });
  });
});
