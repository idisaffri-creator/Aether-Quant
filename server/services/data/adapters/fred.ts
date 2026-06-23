/**
 * FRED (Federal Reserve Economic Data) adapter — unlimited free calls.
 * Provides: US macro economic indicators — GDP, CPI, interest rates, yield curve, unemployment.
 *
 * Env: FRED_API_KEY (get free key at https://fred.stlouisfed.org/docs/api/api_key.html)
 */
import { logger } from "../../../lib/logger";

const BASE = "https://api.stlouisfed.org/fred";
const TIMEOUT_MS = 10000;

const API_KEY = process.env.FRED_API_KEY || "";

// Key macro series for energy trading
const MACRO_SERIES = [
  { id: "DFF", name: "Federal Funds Rate", unit: "%" },
  { id: "DGS10", name: "10-Year Treasury Yield", unit: "%" },
  { id: "DGS2", name: "2-Year Treasury Yield", unit: "%" },
  { id: "DGS30", name: "30-Year Treasury Yield", unit: "%" },
  { id: "T10Y2Y", name: "10Y-2Y Spread", unit: "%" },
  { id: "T10Y3M", name: "10Y-3M Spread", unit: "%" },
  { id: "CPIAUCSL", name: "CPI (All Urban Consumers)", unit: "index" },
  { id: "UNRATE", name: "Unemployment Rate", unit: "%" },
  { id: "GDP", name: "Gross Domestic Product", unit: "billions USD" },
  { id: "OILPRICE", name: "WTI Spot Price (FRED)", unit: "$/bbl" },
] as const;

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getFredStatus() {
  return {
    healthy: lastError === null && !!API_KEY,
    configured: !!API_KEY,
    latencyMs: lastLatencyMs,
    lastFetch,
    error: lastError || undefined,
  };
}

export interface FredSeries {
  id: string;
  name: string;
  unit: string;
  latestValue: number;
  latestDate: string;
  previousValue?: number;
  previousDate?: string;
  change?: number;
  changePercent?: number;
}

async function fredFetch(endpoint: string, params: Record<string, string>): Promise<any | null> {
  if (!API_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({ ...params, api_key: API_KEY, file_type: "json" }).toString();
    const r = await fetch(`${BASE}/${endpoint}?${qs}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`FRED HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    lastError = (err as Error).message;
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch latest observation for a single series.
 */
async function fetchSeriesLatest(seriesId: string): Promise<FredSeries | null> {
  const meta = MACRO_SERIES.find((s) => s.id === seriesId);
  const data = await fredFetch("series/observations", {
    series_id: seriesId,
    sort_order: "desc",
    limit: "2",
    observation_start: "2020-01-01",
  });
  if (!data?.observations || data.observations.length === 0) return null;
  const obs = data.observations;
  const latest = obs[0];
  const previous = obs[1];
  const latestValue = parseFloat(latest.value);
  if (latestValue === -9999 || isNaN(latestValue)) return null;
  const result: FredSeries = {
    id: seriesId,
    name: meta?.name || seriesId,
    unit: meta?.unit || "",
    latestValue,
    latestDate: latest.date,
  };
  if (previous) {
    const pv = parseFloat(previous.value);
    if (pv !== -9999 && !isNaN(pv)) {
      result.previousValue = pv;
      result.previousDate = previous.date;
      result.change = Math.round((latestValue - pv) * 10_000) / 10_000;
      result.changePercent = pv !== 0 ? Math.round(((latestValue - pv) / Math.abs(pv)) * 10_000) / 100 : 0;
    }
  }
  return result;
}

/**
 * Fetch all tracked macro series.
 */
export async function fetchAllMacroSeries(): Promise<FredSeries[]> {
  if (!API_KEY) return [];
  const t0 = Date.now();
  try {
    const results = await Promise.allSettled(
      MACRO_SERIES.map((s) => fetchSeriesLatest(s.id))
    );
    const series = results
      .filter((r): r is PromiseFulfilledResult<FredSeries | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((s): s is FredSeries => s !== null);
    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    logger.debug({ count: series.length, ms: lastLatencyMs }, "fred series fetched");
    return series;
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    return [];
  }
}

/**
 * Fetch yield curve data (spread between long and short-term rates).
 * Useful for recession risk signals that affect energy demand.
 */
export async function fetchYieldCurve(): Promise<FredSeries | null> {
  return fetchSeriesLatest("T10Y2Y");
}

/**
 * Fetch CPI inflation data.
 */
export async function fetchInflation(): Promise<FredSeries | null> {
  return fetchSeriesLatest("CPIAUCSL");
}

/**
 * Fetch federal funds rate.
 */
export async function fetchFedRate(): Promise<FredSeries | null> {
  return fetchSeriesLatest("DFF");
}

/**
 * Search FRED for a series by keyword.
 */
export async function searchFredSeries(searchText: string): Promise<any[] | null> {
  if (!API_KEY) return null;
  return fredFetch("series/search", {
    search_text: searchText,
    limit: "10",
  });
}
