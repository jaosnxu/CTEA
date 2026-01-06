import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // SSL configuration: controlled by DATABASE_SSL and DATABASE_SSL_REJECT_UNAUTHORIZED env vars
      // Default: production requires SSL with certificate validation
      // Set DATABASE_SSL_REJECT_UNAUTHORIZED=false only for self-signed certs in dev/staging
      const useSSL = process.env.DATABASE_SSL === 'true' || 
                     (process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false');
      
      const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
      
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized } : undefined,
        max: 20, // Maximum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      _db = drizzle(_pool);
      
      // Production fail-fast: verify connection immediately
      if (process.env.NODE_ENV === 'production') {
        await _pool.query('SELECT 1');
        console.log('[Database] Production connection verified');
      }
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      
      // Production fail-fast: throw error instead of silent fallback
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Database connection required in production');
      }
      
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

// User operations moved to UserRepository
// Import and use: import { userRepository } from './repositories/user.repository';

export async function upsertUser(user: InsertUser): Promise<void> {
  // Legacy wrapper - delegates to repository
  const { userRepository } = await import('./repositories/user.repository');
  return await userRepository.upsertUser(user);
}

export async function getUserByOpenId(openId: string) {
  // Legacy wrapper - delegates to repository
  const { userRepository } = await import('./repositories/user.repository');
  return await userRepository.getUserByOpenId(openId);
}

// TODO: add feature queries here as your schema grows.
