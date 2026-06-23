/**
 * Fear & Greed Index adapter — free, no key required.
 * Crypto Fear & Greed from Alternative.me (daily, 0-100 scale).
 *
 *   0-24  = Extreme Fear
 *  25-49  = Fear
 *  50     = Neutral
 *  51-74  = Greed
 *  75-100 = Extreme Greed
 *
 * Also fetches CNN Fear & Greed (if available via public endpoint).
 */
import { logger } from "../../../lib/logger";

const CRYPTO_FNG_URL = "https://api.alternative.me/fng/";
const TIMEOUT_MS = 8000;

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getFearGreedStatus() {
  return {
    healthy: lastError === null,
    latencyMs: lastLatencyMs,
    lastFetch,
    error: lastError || undefined,
  };
}

export interface FearGreedPoint {
  value: number;
  classification: string;
  timestamp: number;
}

export interface FearGreedData {
  current: FearGreedPoint;
  history: FearGreedPoint[];
  average7d: number;
  average30d: number;
  trend: "improving" | "deteriorating" | "stable";
  signal: "contrarian_buy" | "contrarian_sell" | "neutral";
}

/**
 * Fetch Crypto Fear & Greed Index (last N days).
 */
export async function fetchFearGreed(limit = 30): Promise<FearGreedData | null> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(`${CRYPTO_FNG_URL}?limit=${limit}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`Fear & Greed HTTP ${r.status}`);
    const json = await r.json();
    const raw = json?.data;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const history: FearGreedPoint[] = raw.map((d: any) => ({
      value: parseInt(d.value, 10),
      classification: d.value_classification,
      timestamp: parseInt(d.timestamp, 10),
    }));

    const current = history[0];
    const values7d = history.slice(0, 7).map((h) => h.value);
    const values30d = history.map((h) => h.value);
    const average7d = Math.round(values7d.reduce((a, b) => a + b, 0) / values7d.length);
    const average30d = Math.round(values30d.reduce((a, b) => a + b, 0) / values30d.length);

    let trend: FearGreedData["trend"] = "stable";
    if (history.length >= 3) {
      const recentAvg = (history[0].value + history[1].value + history[2].value) / 3;
      const olderAvg = (history[Math.min(6, history.length - 1)].value + history[Math.min(5, history.length - 1)].value + history[Math.min(4, history.length - 1)].value) / 3;
      if (recentAvg > olderAvg + 5) trend = "improving";
      else if (recentAvg < olderAvg - 5) trend = "deteriorating";
    }

    let signal: FearGreedData["signal"] = "neutral";
    if (current.value <= 20) signal = "contrarian_buy";
    else if (current.value >= 80) signal = "contrarian_sell";

    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    logger.debug({ value: current.value, cls: current.classification, trend, ms: lastLatencyMs }, "fear/greed fetched");

    return { current, history, average7d, average30d, trend, signal };
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    return null;
  }
}
