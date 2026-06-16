import Redis from "ioredis";
import { logger } from "./logger";
import { cacheHits, cacheMisses } from "./metrics";

const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(url, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (err) => logger.warn({ err: err.message }, "redis error"));
redis.on("connect", () => logger.info("redis connected"));
redis.on("reconnecting", () => logger.warn("redis reconnecting"));

export async function isRedisHealthy(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/**
 * Get-or-set cache helper with metric tracking.
 * `fetcher` runs on miss; result is JSON-serialized.
 */
export async function cacheGetSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) {
      cacheHits.inc({ key });
      return JSON.parse(hit) as T;
    }
  } catch (err) {
    logger.debug({ key, err: (err as Error).message }, "cache get failed");
  }
  cacheMisses.inc({ key });
  const value = await fetcher();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.debug({ key, err: (err as Error).message }, "cache set failed");
  }
  return value;
}
