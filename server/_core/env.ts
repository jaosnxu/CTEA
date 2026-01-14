// Import Zod for schema validation
import { z } from 'zod';

// Define the environment variables schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('3000'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),
  API_KEY: z.string().min(1, 'API_KEY cannot be empty').optional(),
  
  // OAuth Configuration (for standard OAuth providers like Google, VK, Telegram)
  OAUTH_CLIENT_ID: z.string().min(1, 'OAUTH_CLIENT_ID cannot be empty').optional(),
  OAUTH_CLIENT_SECRET: z.string().min(1, 'OAUTH_CLIENT_SECRET cannot be empty').optional(),
  OAUTH_CALLBACK_URL: z.string().url('OAUTH_CALLBACK_URL must be a valid URL').optional(),
  OAUTH_TOKEN_URL: z.string().url('OAUTH_TOKEN_URL must be a valid URL').optional(),
  
  // Manus OAuth Configuration (existing custom OAuth system)
  appId: z.string().optional(),
  oAuthServerUrl: z.string().url().optional(),
  cookieSecret: z.string().optional(),
  ownerOpenId: z.string().optional(),
});

// Parse and validate environment variables
export const ENV = EnvSchema.parse(process.env);

console.log('Environment variables validated successfully:', ENV);