// Import Zod for schema validation
import { z } from "zod";
import { createLogger } from "../src/utils/logger";

const logger = createLogger("Environment");

// Define the environment variables schema
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.string().regex(/^\d+$/, "PORT must be a number").default("3000"),

  // Database configuration - optional for test environments
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL").optional(),
  API_KEY: z.string().min(1, "API_KEY cannot be empty").optional(),

  // Standard OAuth 2.0 / OIDC Configuration (Google, VK, Telegram)
  // Optional - only required if using standard OAuth 2.0 authentication
  OAUTH_CLIENT_ID: z
    .string()
    .min(1, "OAUTH_CLIENT_ID cannot be empty")
    .optional(),
  OAUTH_CLIENT_SECRET: z
    .string()
    .min(1, "OAUTH_CLIENT_SECRET cannot be empty")
    .optional(),
  OAUTH_CALLBACK_URL: z
    .string()
    .url("OAUTH_CALLBACK_URL must be a valid URL")
    .optional(),
  OAUTH_TOKEN_URL: z
    .string()
    .url("OAUTH_TOKEN_URL must be a valid URL")
    .optional(),

  // Manus OAuth Configuration (existing custom OAuth system)
  OAUTH_SERVER_URL: z
    .string()
    .url("OAUTH_SERVER_URL must be a valid URL")
    .optional(),
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID cannot be empty").optional(),
  COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET cannot be empty").optional(),

  // Forge API Configuration
  forgeApiUrl: z.string().optional(),
  forgeApiKey: z.string().optional(),

  // Legacy/compatibility fields
  appId: z.string().optional(),
  oAuthServerUrl: z.string().url().optional(),
  cookieSecret: z.string().optional(),
  ownerOpenId: z.string().optional(),
});

// Parse and validate environment variables
export const ENV = EnvSchema.parse(process.env);

logger.info("Environment variables validated successfully", {
  nodeEnv: ENV.NODE_ENV,
  port: ENV.PORT,
});
