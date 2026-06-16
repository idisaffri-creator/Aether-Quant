import { redis } from "../lib/redis";
import { logger } from "./logger";

const MAX_ATTEMPTS = 5;
const WINDOW_SEC = 15 * 60;

/**
 * Track failed login attempts per identifier (email + IP).
 * After 5 fails in 15 min, return locked until window expires.
 */
export async function recordLoginFailure(identifier: string, ip: string): Promise<void> {
  const key = `login-fail:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SEC);
  }
  await redis.incr(`login-fail-ip:${ip}`);
  await redis.expire(`login-fail-ip:${ip}`, WINDOW_SEC);
  logger.warn({ identifier, ip, count }, "login failure");
}

export async function isLocked(identifier: string, ip: string): Promise<{ locked: boolean; retryAfterSec: number }> {
  const [a, b] = await Promise.all([
    redis.get(`login-fail:${identifier}`),
    redis.get(`login-fail-ip:${ip}`),
  ]);
  const cA = parseInt(a || "0", 10);
  const cB = parseInt(b || "0", 10);
  if (cA >= MAX_ATTEMPTS || cB >= MAX_ATTEMPTS * 3) {
    const ttlA = await redis.ttl(`login-fail:${identifier}`);
    return { locked: true, retryAfterSec: Math.max(ttlA, 60) };
  }
  return { locked: false, retryAfterSec: 0 };
}

export async function clearLoginFailures(identifier: string, ip: string): Promise<void> {
  await Promise.all([
    redis.del(`login-fail:${identifier}`),
    redis.del(`login-fail-ip:${ip}`),
  ]);
}
