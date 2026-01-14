/**
 * OAuth 2.0 Authorization Code Flow Handler
 * 
 * This module handles OAuth callback processing for standard OAuth providers
 * (Google, VK, Telegram, etc.) using the Authorization Code Flow.
 */

import type { Express, Request, Response } from "express";
import axios from "axios";
import { decodeJwt } from "jose";
import { ENV } from "./env";

/**
 * Represents the response from an OAuth token endpoint
 */
interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Represents decoded user information from ID token
 */
interface UserInfo {
  sub: string;  // Subject (user ID)
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

/**
 * Validates that required OAuth environment variables are set
 * @throws Error if required variables are missing
 */
function validateOAuthConfig(): void {
  if (!ENV.OAUTH_CLIENT_ID) {
    throw new Error("OAUTH_CLIENT_ID environment variable is not set");
  }
  if (!ENV.OAUTH_CLIENT_SECRET) {
    throw new Error("OAUTH_CLIENT_SECRET environment variable is not set");
  }
  if (!ENV.OAUTH_CALLBACK_URL) {
    throw new Error("OAUTH_CALLBACK_URL environment variable is not set");
  }
  if (!ENV.OAUTH_TOKEN_URL) {
    throw new Error("OAUTH_TOKEN_URL environment variable is not set");
  }
}

/**
 * Extracts a query parameter from the request
 * @param req - Express request object
 * @param key - Query parameter key
 * @returns The parameter value as a string, or undefined if not present
 */
function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Exchanges an authorization code for access and ID tokens
 * @param code - Authorization code from OAuth provider
 * @returns Token response containing access token and optional ID token
 * @throws Error if token exchange fails
 */
async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  if (!ENV.OAUTH_TOKEN_URL) {
    throw new Error("OAUTH_TOKEN_URL is not configured");
  }

  try {
    const response = await axios.post<TokenResponse>(
      ENV.OAUTH_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: ENV.OAUTH_CLIENT_ID!,
        client_secret: ENV.OAUTH_CLIENT_SECRET!,
        redirect_uri: ENV.OAUTH_CALLBACK_URL!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("[OAuth] Token exchange failed:", error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error_description || error.message;
      throw new Error(`Token exchange failed: ${message}`);
    }
    throw new Error("Token exchange failed");
  }
}

/**
 * Decodes and extracts user information from an ID token
 * @param idToken - JWT ID token from OAuth provider
 * @returns Decoded user information
 * @throws Error if ID token is invalid or missing required fields
 */
function decodeIdToken(idToken: string): UserInfo {
  try {
    const payload = decodeJwt(idToken);
    
    // Validate required fields
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new Error("ID token missing required 'sub' field");
    }

    return payload as UserInfo;
  } catch (error) {
    console.error("[OAuth] Failed to decode ID token:", error);
    throw new Error("Invalid ID token");
  }
}

/**
 * Registers OAuth callback routes with the Express app
 * @param app - Express application instance
 */
export function registerAuthRoutes(app: Express): void {
  /**
   * OAuth callback endpoint
   * Handles the Authorization Code Flow callback from OAuth providers
   * 
   * Query Parameters:
   * - code: Authorization code from the OAuth provider
   * - state: State parameter for CSRF protection
   * 
   * Returns:
   * - 302 redirect to home page on success
   * - 400 if required parameters are missing
   * - 500 if token exchange or processing fails
   */
  app.get("/oauth/callback", async (req: Request, res: Response) => {
    try {
      // Validate OAuth configuration
      validateOAuthConfig();
    } catch (error) {
      console.error("[OAuth] Configuration error:", error);
      res.status(500).json({ 
        error: "OAuth not configured",
        message: error instanceof Error ? error.message : "Unknown error"
      });
      return;
    }

    // Extract and validate query parameters
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      console.warn("[OAuth] Missing authorization code");
      res.status(400).json({ 
        error: "Missing authorization code",
        message: "The 'code' parameter is required"
      });
      return;
    }

    if (!state) {
      console.warn("[OAuth] Missing state parameter");
      res.status(400).json({ 
        error: "Missing state parameter",
        message: "The 'state' parameter is required for CSRF protection"
      });
      return;
    }

    try {
      // Exchange authorization code for tokens
      console.log("[OAuth] Exchanging code for tokens");
      const tokenResponse = await exchangeCodeForTokens(code);

      // Extract and validate ID token
      if (!tokenResponse.id_token) {
        console.error("[OAuth] No ID token in response");
        res.status(500).json({ 
          error: "No ID token received",
          message: "The OAuth provider did not return an ID token"
        });
        return;
      }

      // Decode ID token and extract user information
      console.log("[OAuth] Decoding ID token");
      const userInfo = decodeIdToken(tokenResponse.id_token);

      // Validate user information
      if (!userInfo.sub) {
        console.error("[OAuth] Invalid user information: missing sub");
        res.status(500).json({ 
          error: "Invalid user information",
          message: "User ID (sub) is missing from ID token"
        });
        return;
      }

      // Log successful authentication (in production, you would:
      // 1. Create/update user in database
      // 2. Create session token
      // 3. Set session cookie
      // 4. Redirect to appropriate page)
      console.log("[OAuth] Successfully authenticated user:", {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
      });

      // TODO: Implement session creation and user persistence
      // For now, just redirect to home with success indication
      res.redirect(302, "/?oauth=success");
    } catch (error) {
      console.error("[OAuth] Callback processing failed:", error);
      res.status(500).json({ 
        error: "OAuth callback failed",
        message: error instanceof Error ? error.message : "Unknown error occurred during authentication"
      });
    }
  });
}
