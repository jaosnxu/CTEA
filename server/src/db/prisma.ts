/**
 * Global Prisma Client Instance
 *
 * Singleton pattern to ensure only one Prisma Client instance is created
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Global Prisma Client instance
 */
let prismaInstance: PrismaClient | null = null;

/**
 * Get or create Prisma Client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    // Prisma 7.x requires adapter for PostgreSQL
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const pool = new Pool({ 
      connectionString,
      // Use SSL in production, disable in development/test
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    const adapter = new PrismaPg(pool);

    prismaInstance = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }
  return prismaInstance;
}

/**
 * Close Prisma Client connection
 */
export async function closePrismaClient(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

/**
 * Export default instance
 */
export const prisma = getPrismaClient();
