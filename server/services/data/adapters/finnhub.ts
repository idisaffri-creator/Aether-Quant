/**
 * Finnhub adapter — free tier: 60 API calls/min.
 * Provides: US stock quotes, forex, crypto, earnings, insider trades, SEC filings.
 * WebSocket: free real-time US stock trades + forex ticks.
 *
 * Env: FINNHUB_API_KEY (get free key at https://finnhub.io)
 */
import { logger } from "../../../lib/logger";
import type { MarketData } from "../../../../shared/types";

const BASE = "https://finnhub.io/api/v1";
const TIMEOUT_MS = 8000;

const API_KEY = process.env.FINNHUB_API_KEY || "";

// Energy-relevant symbols on Finnhub
const SYMBOLS = [
  { fh: "CL=F", internal: "WTI" },
  { fh: "BZ=F", internal: "BRENT" },
  { fh: "NG=F", internal: "NGAS" },
  { fh: "GC=F", internal: "GOLD" },
  { fh: "SI=F", internal: "SILVER" },
  { fh: "HG=F", internal: "COPPER" },
  { fh: "HO=F", internal: "HEATOIL" },
  { fh: "RB=F", internal: "GASOL" },
] as const;

interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
  v: number;   // volume
  t: number;   // timestamp
}

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getFinnhubStatus() {
  return {
    healthy: lastError === null && !!API_KEY,
    configured: !!API_KEY,
    latencyMs: lastLatencyMs,
    lastFetch,
    error: lastError || undefined,
  };
}

async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!API_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
    const data = await r.json() as FinnhubQuote;
    if (!data || !Number.isFinite(data.c) || data.c === 0) return null;
    return data;
  } catch (err) {
    logger.debug({ symbol, err: (err as Error).message }, "finnhub quote failed");
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch quotes for all energy symbols.
 * Returns null if API key not configured or all fail.
 */
export async function fetchFinnhubQuotes(): Promise<MarketData[] | null> {
  if (!API_KEY) return null;
  const t0 = Date.now();
  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(async (s) => {
        const q = await fetchQuote(s.fh);
        if (!q) return null;
        return {
          symbol: s.internal,
          price: round2(q.c),
          change24h: round2(q.dp),
          volume24h: q.v || 0,
          high24h: round2(q.h || q.c),
          low24h: round2(q.l || q.c),
          bid: round2(q.c * 0.9995),
          ask: round2(q.c * 1.0005),
          spread: round4(q.c * 0.001),
          timestamp: (q.t || Date.now() / 1000) * 1000,
        } as MarketData;
      })
    );
    const quotes = results
      .filter((r): r is PromiseFulfilledResult<MarketData | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((q): q is MarketData => q !== null);
    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    if (quotes.length > 0) {
      logger.debug({ count: quotes.length, ms: lastLatencyMs }, "finnhub quotes fetched");
    }
    return quotes.length > 0 ? quotes : null;
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    return null;
  }
}

/**
 * Fetch company earnings or basic financials for a symbol.
 */
export async function fetchFinnhubFinancials(symbol: string): Promise<any | null> {
  if (!API_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${API_KEY}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch news sentiment for a symbol.
 */
export async function fetchFinnhubNewsSentiment(symbol: string): Promise<any | null> {
  if (!API_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/news-sentiment?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch recent market news.
 */
export async function fetchFinnhubMarketNews(category: string = "general"): Promise<any[] | null> {
  if (!API_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/news?category=${category}&token=${API_KEY}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round4(n: number) { return Math.round(n * 10_000) / 10_000; }
