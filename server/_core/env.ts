// Import Zod for schema validation
import { z } from 'zod';

// Define the environment variables schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  API_KEY: z.string().min(1, 'API_KEY cannot be empty'),
});

// Parse and validate environment variables
export const ENV = EnvSchema.parse(process.env);

console.log('Environment variables validated successfully:', ENV);