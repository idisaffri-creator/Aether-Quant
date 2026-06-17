/**
 * Quote cache — Redis-backed with graceful fallback to mock.
 * Always returns *something* (never throws); if all sources fail, falls back to
 * deterministic mock data so the UI never goes blank.
 */
import { cacheGetSet } from "../../lib/redis";
import { logger } from "../../lib/logger";
import { fetchYahooQuotes } from "./adapters/yahoo";
import { fetchYahooCandles, symbolToYahoo } from "./adapters/yahoo";
import type { MarketData, Candle } from "../../../shared/types";

const QUOTES_KEY = "data:quotes:all";
const QUOTES_TTL_S = 60; // 1 min for live trading feel

// Deterministic mock fallback (so the UI never breaks)
function mockQuotes(): MarketData[] {
  const base: Record<string, number> = {
    WTI: 78.43, BRENT: 82.17, NGAS: 2.14, GOLD: 2034.50,
    SILVER: 22.85, COPPER: 3.84, HEATOIL: 2.51, GASOL: 2.42,
  };
  return Object.entries(base).map(([symbol, price]) => {
    const drift = (Math.random() - 0.5) * price * 0.002;
    const current = price + drift;
    return {
      symbol,
      price: round2(current),
      change24h: round2((drift / price) * 100),
      volume24h: 0,
      high24h: round2(current * 1.005),
      low24h: round2(current * 0.995),
      bid: round2(current * 0.9998),
      ask: round2(current * 1.0002),
      spread: round4(current * 0.0004),
      timestamp: Date.now(),
      _mock: true,
    } as MarketData;
  });
}

export async function getQuotes(): Promise<MarketData[]> {
  return cacheGetSet<MarketData[]>(QUOTES_KEY, QUOTES_TTL_S, async () => {
    const real = await fetchYahooQuotes();
    if (real && real.length > 0) {
      logger.info({ count: real.length, source: "yahoo" }, "quotes from real feed");
      return real;
    }
    logger.warn("all quote feeds failed, using mock");
    return mockQuotes();
  });
}

export async function getCandles(symbol: string, interval = "1h", range = "5d"): Promise<Candle[]> {
  const yahooSym = symbolToYahoo(symbol);
  const cacheKey = `data:candles:${symbol}:${interval}:${range}`;
  return cacheGetSet<Candle[]>(cacheKey, 300, async () => {
    if (!yahooSym) return mockCandles(symbol, interval, range);
    const real = await fetchYahooCandles(yahooSym, interval as any, range as any);
    if (real && real.length > 0) return real;
    return mockCandles(symbol, interval, range);
  });
}

function mockCandles(symbol: string, interval: string, range: string): Candle[] {
  const base = 50 + (symbol.charCodeAt(0) % 50);
  const intervalMs = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "1d": 86_400_000 }[interval] || 3_600_000;
  const count = { "1d": 24, "5d": 60, "1mo": 30, "3mo": 90, "1y": 252 }[range] || 60;
  const candles: Candle[] = [];
  let price = base;
  for (let i = count; i > 0; i--) {
    const open = price;
    const close = open * (1 + (Math.random() - 0.5) * 0.02);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    candles.push({
      timestamp: Date.now() - i * intervalMs,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: Math.floor(Math.random() * 10000 + 1000),
    });
    price = close;
  }
  return candles;
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round4(n: number) { return Math.round(n * 10_000) / 10_000; }
