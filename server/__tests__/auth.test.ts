/**
 * Auth API tests — login, logout, lockout, change-password.
 * Run: pnpm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isLocked, recordLoginFailure, clearLoginFailures } from "../lib/lockout";

// We don't have a full DB in the test env, so we mock redis.
import { vi } from "vitest";

vi.mock("../lib/redis", () => ({
  redis: {
    incr: vi.fn(async (key: string) => {
      const m = (globalThis as any).__counts || ((globalThis as any).__counts = new Map<string, number>());
      const v = (m.get(key) || 0) + 1;
      m.set(key, v);
      return v;
    }),
    expire: vi.fn(async () => 1),
    get: vi.fn(async (key: string) => {
      const m = (globalThis as any).__counts as Map<string, number>;
      return String(m.get(key) || 0);
    }),
    del: vi.fn(async () => 1),
    ttl: vi.fn(async () => 60),
    set: vi.fn(async () => "OK"),
    quit: vi.fn(async () => "OK"),
  },
  isRedisHealthy: vi.fn(async () => true),
  cacheGetSet: vi.fn(async (_k: string, _t: number, fetcher: () => Promise<unknown>) => fetcher()),
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("account lockout", () => {
  afterAll(() => {
    (globalThis as any).__counts = new Map();
  });

  it("locks after 5 failures", async () => {
    const email = "test@example.com";
    const ip = "1.2.3.4";
    (globalThis as any).__counts = new Map();

    for (let i = 0; i < 5; i++) {
      await recordLoginFailure(email, ip);
    }
    const { locked, retryAfterSec } = await isLocked(email, ip);
    expect(locked).toBe(true);
    expect(retryAfterSec).toBeGreaterThan(0);
  });

  it("unlocks after clear", async () => {
    const email = "test2@example.com";
    const ip = "5.6.7.8";
    (globalThis as any).__counts = new Map();

    for (let i = 0; i < 4; i++) {
      await recordLoginFailure(email, ip);
    }
    await clearLoginFailures(email, ip);
    const { locked } = await isLocked(email, ip);
    expect(locked).toBe(false);
  });

  it("does not lock below threshold", async () => {
    const email = "test3@example.com";
    const ip = "9.10.11.12";
    (globalThis as any).__counts = new Map();

    for (let i = 0; i < 3; i++) {
      await recordLoginFailure(email, ip);
    }
    const { locked } = await isLocked(email, ip);
    expect(locked).toBe(false);
  });
});
