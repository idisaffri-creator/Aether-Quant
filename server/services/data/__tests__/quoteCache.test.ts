/**
 * Quote cache tests — ensures fallback to mock when all feeds fail.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/redis", () => ({
  cacheGetSet: vi.fn(async (_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()),
  redis: { set: vi.fn(), get: vi.fn(), quit: vi.fn() },
}));
vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../adapters/yahoo", () => ({
  fetchYahooQuotes: vi.fn(async () => null), // simulate Yahoo failing
  fetchYahooCandles: vi.fn(async () => null),
  symbolToYahoo: vi.fn(() => "CL=F"),
  getYahooStatus: vi.fn(() => ({ healthy: false, latencyMs: 0, lastFetch: null, symbolCount: 8 })),
}));

import { getQuotes, getCandles } from "../quoteCache";

describe("quoteCache", () => {
  it("falls back to mock quotes when all feeds fail", async () => {
    const quotes = await getQuotes();
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes.find((q) => q.symbol === "WTI")).toBeTruthy();
    expect(quotes.find((q) => q.symbol === "GOLD")).toBeTruthy();
    expect((quotes[0] as any)._mock).toBe(true);
  });

  it("returns candles for a known symbol", async () => {
    const candles = await getCandles("WTI", "1h", "5d");
    expect(candles.length).toBeGreaterThan(0);
    expect(candles[0]).toHaveProperty("open");
    expect(candles[0]).toHaveProperty("close");
    expect(candles[0]).toHaveProperty("timestamp");
  });
});
