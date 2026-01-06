/**
 * CHU TEA - Redis Cache Service
 * 
 * Centralized Redis caching for:
 * - Product catalog (high-frequency reads)
 * - Store information
 * - Session data
 */

import Redis from 'ioredis';
import { logger } from './logger';

/**
 * Redis client instance
 */
let redis: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initRedis() {
  // Skip Redis in development if not explicitly configured
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
    logger.info('Redis disabled in development (set REDIS_URL to enable)');
    return null;
  }
  
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redis = new Redis(redisUrl, {
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (err) => {
      logger.error({ error: err }, 'Redis connection error');
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return redis;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis');
    return null;
  }
}

/**
 * Get Redis client (auto-initialize if needed)
 */
export function getRedis(): Redis | null {
  if (!redis) {
    return initRedis();
  }
  return redis;
}

/**
 * Cache keys
 */
export const CacheKeys = {
  PRODUCTS_LIST: 'products:list',
  PRODUCT: (id: string) => `product:${id}`,
  STORE_INFO: (id: string) => `store:${id}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
  MEMBERSHIP_TIER: (userId: string) => `membership:${userId}`,
};

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  PRODUCTS: 300, // 5 minutes
  STORE_INFO: 600, // 10 minutes
  USER_SESSION: 3600, // 1 hour
  MEMBERSHIP: 1800, // 30 minutes
};

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    logger.error({ error, key }, 'Redis get error');
    return null;
  }
}

/**
 * Set cached value
 */
export async function setCache(
  key: string,
  value: any,
  ttl?: number
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    const serialized = JSON.stringify(value);
    
    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    logger.debug({ key, ttl }, 'Cache set successfully');
    return true;
  } catch (error) {
    logger.error({ error, key }, 'Redis set error');
    return false;
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.del(key);
    logger.debug({ key }, 'Cache deleted successfully');
    return true;
  } catch (error) {
    logger.error({ error, key }, 'Redis delete error');
    return false;
  }
}

/**
 * Delete multiple cached values by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    const deleted = await client.del(...keys);
    logger.debug({ pattern, count: deleted }, 'Cache pattern deleted');
    return deleted;
  } catch (error) {
    logger.error({ error, pattern }, 'Redis delete pattern error');
    return 0;
  }
}

/**
 * Check if key exists in cache
 */
export async function hasCache(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error({ error, key }, 'Redis exists error');
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connection');
  await closeRedis();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connection');
  await closeRedis();
});
