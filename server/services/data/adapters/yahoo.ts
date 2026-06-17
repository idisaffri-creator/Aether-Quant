/**
 * Yahoo Finance public query API adapter.
 * No key required. ~15-min delayed (free tier).
 * Rate-limit friendly: 1 req / 2s.
 *
 * Symbol mapping for energy commodities:
 *   CL=F  WTI Crude Oil futures
 *   BZ=F  Brent Crude futures
 *   NG=F  Natural Gas futures
 *   GC=F  Gold futures
 *   SI=F  Silver futures
 *   HG=F  Copper futures
 *   HO=F  Heating Oil futures
 *   RB=F  RBOB Gasoline futures
 */
import { logger } from "../../../lib/logger";
import type { MarketData, Candle } from "../../../../shared/types";

const SYMBOLS = ["CL=F", "BZ=F", "NG=F", "GC=F", "SI=F", "HG=F", "HO=F", "RB=F"] as const;
type YSymbol = (typeof SYMBOLS)[number];

const YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const TIMEOUT_MS = 5000;
const USER_AGENT = "Mozilla/5.0 (Aether-Quant; +https://aether-energy.ai)";

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        currency: string;
        exchangeName: string;
        regularMarketTime: number;
      };
      indicators: {
        quote: Array<{
          close?: number[];
          high?: number[];
          low?: number[];
          volume?: number[];
        }>;
      };
    }>;
    error?: { code: string; description: string };
  };
}

export interface YahooFeedStatus {
  healthy: boolean;
  latencyMs: number;
  lastFetch: string | null;
  symbolCount: number;
  error?: string;
}

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getYahooStatus(): YahooFeedStatus {
  return {
    healthy: lastError === null,
    latencyMs: lastLatencyMs,
    lastFetch,
    symbolCount: SYMBOLS.length,
    error: lastError || undefined,
  };
}

async function fetchChart(symbol: YSymbol): Promise<YahooChartResponse> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${YAHOO_URL}/${encodeURIComponent(symbol)}?interval=1h&range=5d`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
    return (await r.json()) as YahooChartResponse;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch current quotes for all energy symbols.
 * Returns null on failure (caller should fall back to mock).
 */
export async function fetchYahooQuotes(): Promise<MarketData[] | null> {
  const t0 = Date.now();
  try {
    const results = await Promise.allSettled(SYMBOLS.map(fetchChart));
    const quotes: MarketData[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const sym = SYMBOLS[i];
      if (r.status !== "fulfilled" || !r.value.chart.result?.[0]) continue;
      const meta = r.value.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      if (!Number.isFinite(price)) continue;
      const prev = meta.previousClose || price;
      quotes.push({
        symbol: yahooToSymbol(sym),
        price: round2(price),
        change24h: round2(((price - prev) / prev) * 100),
        volume24h: meta.regularMarketVolume || 0,
        high24h: round2(meta.regularMarketDayHigh || price),
        low24h: round2(meta.regularMarketDayLow || price),
        bid: round2(price * 0.9995),
        ask: round2(price * 1.0005),
        spread: round4(price * 0.001),
        timestamp: (meta.regularMarketTime || Date.now() / 1000) * 1000,
      });
    }
    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    logger.debug({ count: quotes.length, ms: lastLatencyMs }, "yahoo quotes fetched");
    return quotes.length > 0 ? quotes : null;
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    logger.warn({ err: lastError }, "yahoo quotes failed");
    return null;
  }
}

/**
 * Fetch OHLCV candles for a symbol. `range` is e.g. "1d", "5d", "1mo", "1y".
 * `interval` is "1m", "5m", "1h", "1d".
 */
export async function fetchYahooCandles(
  symbol: YSymbol,
  interval: "1m" | "5m" | "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" | "3mo" | "1y" = "5d"
): Promise<Candle[] | null> {
  try {
    const r = await fetchChart(symbol);
    const result = r.chart.result?.[0];
    if (!result) return null;
    const q = result.indicators.quote[0];
    if (!q.close) return null;
    // Yahoo returns the chart timestamps in meta (not here), approximate by step
    const closes = q.close.filter(Number.isFinite) as number[];
    const highs = (q.high || []).filter(Number.isFinite) as number[];
    const lows = (q.low || []).filter(Number.isFinite) as number[];
    const vols = (q.volume || []).filter(Number.isFinite) as number[];
    const intervalMs = intervalToMs(interval);
    const lastTime = (result.meta.regularMarketTime || Date.now() / 1000) * 1000;
    const candles: Candle[] = closes.map((close, i) => {
      const ts = lastTime - (closes.length - 1 - i) * intervalMs;
      return {
        timestamp: ts,
        open: i > 0 ? closes[i - 1] : close, // Yahoo doesn't return open in this endpoint
        high: highs[i] ?? close,
        low: lows[i] ?? close,
        close: round2(close),
        volume: vols[i] ?? 0,
      };
    });
    return candles;
  } catch (err) {
    logger.warn({ symbol, err: (err as Error).message }, "yahoo candles failed");
    return null;
  }
}

function yahooToSymbol(y: YSymbol): string {
  const map: Record<YSymbol, string> = {
    "CL=F": "WTI",
    "BZ=F": "BRENT",
    "NG=F": "NGAS",
    "GC=F": "GOLD",
    "SI=F": "SILVER",
    "HG=F": "COPPER",
    "HO=F": "HEATOIL",
    "RB=F": "GASOL",
  };
  return map[y];
}

export function symbolToYahoo(s: string): YSymbol | null {
  const inv: Record<string, YSymbol> = {
    WTI: "CL=F",
    BRENT: "BZ=F",
    NGAS: "NG=F",
    GOLD: "GC=F",
    SILVER: "SI=F",
    COPPER: "HG=F",
    HEATOIL: "HO=F",
    GASOL: "RB=F",
  };
  return inv[s.toUpperCase()] || null;
}

function intervalToMs(i: string): number {
  return { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "1d": 86_400_000 }[i] || 3_600_000;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10_000) / 10_000; }
