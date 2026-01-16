// Import Zod for schema validation
import { z } from "zod";

// Define the environment variables schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.string().regex(/^\d+$/, "PORT must be a number"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  API_KEY: z.string().min(1, "API_KEY cannot be empty"),
  OAUTH_CLIENT_ID: z.string().min(1, "OAUTH_CLIENT_ID cannot be empty"),
  OAUTH_CLIENT_SECRET: z.string().min(1, "OAUTH_CLIENT_SECRET cannot be empty"),
  OAUTH_CALLBACK_URL: z.string().url("OAUTH_CALLBACK_URL must be a valid URL"),
  OAUTH_SERVER_URL: z.string().url("OAUTH_SERVER_URL must be a valid URL"),
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID cannot be empty"),
  COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET cannot be empty"),
  // Optional Forge API credentials (for storage, maps, notifications, voice)
  forgeApiUrl: z.string().optional(),
  forgeApiKey: z.string().optional(),
  // Optional owner OpenID (for database initialization)
  ownerOpenId: z.string().optional(),
});

// Parse and validate environment variables
export const ENV = EnvSchema.parse(process.env);

console.log("Environment variables validated successfully:", ENV);
