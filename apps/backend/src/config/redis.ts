// apps/backend/src/config/redis.ts
import Redis from "ioredis";
import { serviceConfig } from "./services";

// ── Cache Client ─────────────────────────────────────────────────────────────
// Used for GET/SET/DEL operations throughout the app.
// NEVER subscribe on this client — ioredis enters subscriber mode on SUBSCRIBE
// and rejects all non-pub/sub commands, which would break cacheGet/cacheSet.

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis> => {
  const url = serviceConfig.redis.url || "redis://localhost:6379";

  redisClient = new Redis(url, {
    maxRetriesPerRequest: serviceConfig.redis.maxRetriesPerRequest,
    lazyConnect: true,   // ← FIXED: prevents auto-connect, enables explicit .connect()
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn(
          "⚠️ Redis connection failed after 3 attempts. Running without cache.",
        );
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  // Listeners BEFORE connect() — event may fire on resolution
  redisClient.on("connect", () => console.log("✅ Redis connected"));
  redisClient.on("error", (err) =>
    console.warn("Redis error (non-fatal):", err.message),
  );

  // Now .connect() is valid — status is "wait"
  await redisClient.connect();
  return redisClient;
};

export const getRedis = (): Redis => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};

// ── Cache Helpers ─────────────────────────────────────────────────────────────

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await getRedis().get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> => {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Non-fatal — app continues without caching
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await getRedis().del(key);
  } catch {
    // Non-fatal
  }
};

// ── Socket.IO Adapter Clients ─────────────────────────────────────────────────
// Dedicated pub/sub pair for @socket.io/redis-adapter.
// Stored at module scope so closeRedisConnections() can quit all three clients
// in one place without server.ts needing to track them.

let adapterPubClient: Redis | null = null;
let adapterSubClient: Redis | null = null;

export interface AdapterClients {
  pubClient: Redis;
  subClient: Redis;
}

export const createAdapterClients = (): AdapterClients => {
  const url = serviceConfig.redis.url || "redis://localhost:6379";
  const { adapter } = serviceConfig.redis;

  adapterPubClient = new Redis(url, {
    maxRetriesPerRequest: adapter.maxRetriesPerRequest,
    enableReadyCheck: adapter.enableReadyCheck,
    lazyConnect: adapter.lazyConnect,  // ← FIXED: now true from config
    retryStrategy: adapter.retryStrategy,
  });

  // duplicate() clones all connection options — including lazyConnect
  adapterSubClient = adapterPubClient.duplicate();

  // Only error handlers needed — 'connect' events are implicit
  adapterPubClient.on("error", (err) =>
    console.warn("Redis adapter pubClient error:", err.message),
  );
  adapterSubClient.on("error", (err) =>
    console.warn("Redis adapter subClient error:", err.message),
  );

  return { pubClient: adapterPubClient, subClient: adapterSubClient };
};

// ── Unified Shutdown ──────────────────────────────────────────────────────────
// Closes all three clients cleanly on SIGTERM.
// Promise.allSettled — one client failing to quit doesn't block the others.

export const closeRedisConnections = async (): Promise<void> => {
  await Promise.allSettled([
    redisClient?.quit(),
    adapterPubClient?.quit(),
    adapterSubClient?.quit(),
  ]);
  console.log("🔌 Redis connections closed.");
};