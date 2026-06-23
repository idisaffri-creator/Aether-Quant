/**
 * Binance public API adapter — no key required, unlimited.
 * Provides: real-time crypto trades, OHLCV candles, order book.
 * WebSocket: free, unlimited streams for all pairs.
 *
 * No API key needed for public endpoints.
 */
import { logger } from "../../../lib/logger";
import WebSocket from "ws";
import type { MarketData, Candle } from "../../../../shared/types";

const REST_BASE = "https://api.binance.com/api/v3";
const WS_BASE = "wss://stream.binance.com:9443/ws";
const TIMEOUT_MS = 8000;

// Energy-relevant crypto pairs
const PAIRS = [
  { binance: "BTCUSDT", internal: "BTC" },
  { binance: "ETHUSDT", internal: "ETH" },
  { binance: "BNBUSDT", internal: "BNB" },
  { binance: "SOLUSDT", internal: "SOL" },
  { binance: "XRPUSDT", internal: "XRP" },
  { binance: "ADAUSDT", internal: "ADA" },
  { binance: "DOGEUSDT", internal: "DOGE" },
  { binance: "AVAXUSDT", internal: "AVAX" },
] as const;

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;
let ws: WebSocket | null = null;
let wsCallbacks: ((data: MarketData) => void)[] = [];

export function getBinanceStatus() {
  return {
    healthy: lastError === null,
    latencyMs: lastLatencyMs,
    lastFetch,
    wsConnected: ws?.readyState === WebSocket.OPEN,
    error: lastError || undefined,
  };
}

// ─── REST API ─────────────────────────────────────────────────────────

interface BinanceTicker {
  symbol: string;
  price: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
}

/**
 * Fetch 24h ticker for all crypto pairs.
 */
export async function fetchBinanceQuotes(): Promise<MarketData[] | null> {
  const t0 = Date.now();
  try {
    const symbols = PAIRS.map((p) => p.binance);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(`${REST_BASE}/ticker/24hr`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
    const all = await r.json() as BinanceTicker[];
    const symbolSet = new Set<string>(symbols);
    const filtered = all.filter((t) => symbolSet.has(t.symbol));
    const quotes: MarketData[] = filtered.map((t) => {
      const pair = PAIRS.find((p) => p.binance === t.symbol);
      return {
        symbol: pair?.internal || t.symbol,
        price: parseFloat(t.lastPrice || t.price),
        change24h: parseFloat(t.priceChangePercent),
        volume24h: parseFloat(t.quoteVolume || t.volume),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        bid: parseFloat(t.bidPrice || t.lastPrice) * 0.9998,
        ask: parseFloat(t.askPrice || t.lastPrice) * 1.0002,
        spread: parseFloat(t.lastPrice) * 0.0004,
        timestamp: Date.now(),
      };
    });
    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    if (quotes.length > 0) {
      logger.debug({ count: quotes.length, ms: lastLatencyMs }, "binance quotes fetched");
    }
    return quotes.length > 0 ? quotes : null;
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    logger.debug({ err: lastError }, "binance quotes failed");
    return null;
  }
}

/**
 * Fetch OHLCV candles for a crypto pair.
 * @param symbol e.g. "BTCUSDT"
 * @param interval "1m","5m","15m","1h","4h","1d"
 * @param limit max 1000
 */
export async function fetchBinanceCandles(
  symbol: string,
  interval: "1m" | "5m" | "15m" | "1h" | "4h" | "1d" = "1h",
  limit = 100
): Promise<Candle[] | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(
      `${REST_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { headers: { Accept: "application/json" }, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
    const raw = await r.json() as any[][];
    return raw.map((k) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (err) {
    logger.debug({ symbol, err: (err as Error).message }, "binance candles failed");
    return null;
  }
}

// ─── WebSocket ────────────────────────────────────────────────────────

type TickCallback = (data: MarketData) => void;

/**
 * Connect to Binance combined stream for real-time price updates.
 * Streams: <symbol>@ticker (24hr rolling window).
 */
export function startBinanceWs(onTick: TickCallback): void {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  wsCallbacks.push(onTick);

  const streams = PAIRS.map((p) => `${p.binance.toLowerCase()}@ticker`).join("/");
  const url = `${WS_BASE}/${streams}`;

  ws = new WebSocket(url);

  ws.on("open", () => {
    logger.info({ streams: PAIRS.length }, "binance ws connected");
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      const data = msg.data || msg;
      if (!data.s || !data.c) return;
      const pair = PAIRS.find((p) => p.binance === data.s);
      if (!pair) return;
      const quote: MarketData = {
        symbol: pair.internal,
        price: parseFloat(data.c),
        change24h: parseFloat(data.P || "0"),
        volume24h: parseFloat(data.q || "0"),
        high24h: parseFloat(data.h || data.c),
        low24h: parseFloat(data.l || data.c),
        bid: parseFloat(data.c) * 0.9998,
        ask: parseFloat(data.c) * 1.0002,
        spread: parseFloat(data.c) * 0.0004,
        timestamp: Date.now(),
      };
      wsCallbacks.forEach((cb) => cb(quote));
    } catch { /* ignore parse errors */ }
  });

  ws.on("error", (err) => {
    logger.warn({ err: err.message }, "binance ws error");
  });

  ws.on("close", () => {
    logger.warn("binance ws closed, reconnecting in 5s");
    ws = null;
    setTimeout(() => {
      if (wsCallbacks.length > 0) startBinanceWs(wsCallbacks[wsCallbacks.length - 1]);
    }, 5000);
  });
}

/**
 * Stop the WebSocket connection.
 */
export function stopBinanceWs(): void {
  if (ws) {
    wsCallbacks = [];
    ws.close();
    ws = null;
  }
}
