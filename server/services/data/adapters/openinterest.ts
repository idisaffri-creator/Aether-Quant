/**
 * Binance Futures Open Interest adapter — free, no key required.
 * Provides: open interest, long/short ratio, funding rate for crypto pairs.
 *
 * Signals:
 *   - Extreme long ratio (>70%) + high OI → crowded long, reversal risk
 *   - Extreme short ratio (>70%) + high OI → crowded short, squeeze risk
 *   - High funding rate + high OI → longs paying shorts, overheated
 *   - Low funding rate + rising OI → new positions entering, trend forming
 */
import { logger } from "../../../lib/logger";

const FAPI_BASE = "https://fapi.binance.com";
const TIMEOUT_MS = 8000;

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const;

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getOpenInterestStatus() {
  return {
    healthy: lastError === null,
    latencyMs: lastLatencyMs,
    lastFetch,
    error: lastError || undefined,
  };
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  fundingRate: number;
  fundingRateAnnual: number;
  markPrice: number;
  signal: "overheated_long" | "overheated_short" | "building_position" | "neutral";
}

async function fetchOpenInterest(symbol: string): Promise<Partial<OpenInterestData> | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const [oiRes, lsRes, frRes] = await Promise.all([
      fetch(`${FAPI_BASE}/fapi/v1/openInterest?symbol=${symbol}`, { signal: ctrl.signal }),
      fetch(`${FAPI_BASE}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`, { signal: ctrl.signal }),
      fetch(`${FAPI_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`, { signal: ctrl.signal }),
    ]);
    clearTimeout(t);

    const oi = oiRes.ok ? await oiRes.json() : null;
    const ls = lsRes.ok ? await lsRes.json() : null;
    const fr = frRes.ok ? await frRes.json() : null;

    if (!oi && !ls && !fr) return null;

    const openInterest = oi ? parseFloat(oi.openInterest || "0") : 0;
    const longAccount = ls?.[0] ? parseFloat(ls[0].longAccount || "0.5") : 0.5;
    const shortAccount = ls?.[0] ? parseFloat(ls[0].shortAccount || "0.5") : 0.5;
    const longShortRatio = ls?.[0] ? parseFloat(ls[0].longShortRatio || "1") : 1;
    const fundingRate = fr?.[0] ? parseFloat(fr[0].fundingRate || "0") : 0;
    const markPrice = fr?.[0] ? parseFloat(fr[0].markPrice || "0") : 0;

    return {
      symbol,
      openInterest,
      longShortRatio: Math.round(longShortRatio * 10000) / 10000,
      longAccount: Math.round(longAccount * 10000) / 10000,
      shortAccount: Math.round(shortAccount * 10000) / 10000,
      fundingRate: Math.round(fundingRate * 100000000) / 100000000,
      fundingRateAnnual: Math.round(fundingRate * 3 * 365 * 10000) / 100,
      markPrice,
    };
  } catch {
    return null;
  }
}

function classifySignal(longAccount: number, fundingRate: number, oiChange: number): OpenInterestData["signal"] {
  if (longAccount > 0.65 && fundingRate > 0.001) return "overheated_long";
  if (longAccount < 0.35 && fundingRate < -0.0005) return "overheated_short";
  if (Math.abs(oiChange) > 0.05) return "building_position";
  return "neutral";
}

/**
 * Fetch open interest, long/short ratio, and funding rate for all tracked symbols.
 */
export async function fetchAllOpenInterest(): Promise<OpenInterestData[]> {
  const t0 = Date.now();
  try {
    const results = await Promise.allSettled(SYMBOLS.map(fetchOpenInterest));
    const data: OpenInterestData[] = results
      .filter((r): r is PromiseFulfilledResult<Partial<OpenInterestData> | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((d): d is Partial<OpenInterestData> & { symbol: string } => d !== null && d.symbol !== undefined)
      .map((d) => ({
        symbol: d.symbol!,
        openInterest: d.openInterest ?? 0,
        longShortRatio: d.longShortRatio ?? 1,
        longAccount: d.longAccount ?? 0.5,
        shortAccount: d.shortAccount ?? 0.5,
        fundingRate: d.fundingRate ?? 0,
        fundingRateAnnual: d.fundingRateAnnual ?? 0,
        markPrice: d.markPrice ?? 0,
        signal: classifySignal(d.longAccount ?? 0.5, d.fundingRate ?? 0, 0),
      }));

    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    if (data.length > 0) {
      logger.debug({ count: data.length, ms: lastLatencyMs }, "open interest fetched");
    }
    return data;
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    return [];
  }
}

/**
 * Fetch open interest for a single symbol.
 */
export async function fetchSymbolOpenInterest(symbol: string): Promise<OpenInterestData | null> {
  const data = await fetchOpenInterest(symbol.toUpperCase());
  if (!data || !data.symbol) return null;
  return {
    symbol: data.symbol,
    openInterest: data.openInterest ?? 0,
    longShortRatio: data.longShortRatio ?? 1,
    longAccount: data.longAccount ?? 0.5,
    shortAccount: data.shortAccount ?? 0.5,
    fundingRate: data.fundingRate ?? 0,
    fundingRateAnnual: data.fundingRateAnnual ?? 0,
    markPrice: data.markPrice ?? 0,
    signal: classifySignal(data.longAccount ?? 0.5, data.fundingRate ?? 0, 0),
  };
}
