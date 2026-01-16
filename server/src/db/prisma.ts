/**
 * Global Prisma Client Instance
 *
 * Singleton pattern to ensure only one Prisma Client instance is created
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;

// Type alias for PrismaClient instance
type PrismaClientInstance = InstanceType<typeof PrismaClient>;

/**
 * Global Prisma Client instance
 */
let prismaInstance: PrismaClientInstance | null = null;

/**
 * Get or create Prisma Client instance
 */
export function getPrismaClient(): PrismaClientInstance {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Prisma 7.x with MySQL - direct connection using DATABASE_URL from env
    prismaInstance = new PrismaClient({
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
