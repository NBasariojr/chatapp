// backend/src/config/redis.ts
import Redis from 'ioredis';

let redisClient: Redis;

export const connectRedis = async (): Promise<Redis> => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('⚠️ Redis connection failed after 3 attempts. Running without cache.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (err) => console.warn('Redis error (non-fatal):', err.message));

  return redisClient;
};

export const getRedis = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

// Cache helpers
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await getRedis().get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 300): Promise<void> => {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Non-fatal cache failure - continue without caching
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await getRedis().del(key);
  } catch {
    // Non-fatal
  }
};