/**
 * Global Prisma Client Instance
 *
 * Singleton pattern to ensure only one Prisma Client instance is created
 * Uses lazy initialization to ensure environment variables are loaded first
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { Pool } from "pg";
import pgAdapter from "@prisma/adapter-pg";
const { PrismaPg } = pgAdapter;

/**
 * Global Prisma Client instance
 */
let prismaInstance: PrismaClient | null = null;

/**
 * Get or create Prisma Client instance
 * Uses lazy initialization to ensure DATABASE_URL is available
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is not set. Please configure it in your .env file."
      );
    }

    // Prisma 7.x requires adapter for PostgreSQL
    const pool = new Pool({ connectionString });
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
 * Lazy proxy for Prisma Client
 * This ensures the client is only instantiated when first accessed,
 * after environment variables have been loaded
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});
