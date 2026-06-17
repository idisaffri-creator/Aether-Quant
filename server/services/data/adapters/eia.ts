/**
 * U.S. Energy Information Administration (EIA) API v2 adapter.
 * Free with API key. 2,500 requests/day.
 * Docs: https://www.eia.gov/opendata/documentation.php
 *
 * Used for: crude inventories, production, refining, prices, natural gas storage.
 */
import { logger } from "../../../lib/logger";

const EIA_BASE = "https://api.eia.gov/v2";
const TIMEOUT_MS = 5000;
const CACHE_TTL_S = 3600; // 1 hour — EIA daily data

export interface EiaSeries {
  id: string;
  name: string;
  period: string;
  value: number;
  unit: string;
  fetchedAt: string;
}

export interface EiaFeedStatus {
  healthy: boolean;
  configured: boolean;
  lastFetch: string | null;
  error?: string;
}

let lastFetch: string | null = null;
let lastError: string | null = null;

export function getEiaStatus(): EiaFeedStatus {
  return {
    healthy: lastError === null,
    configured: !!process.env.EIA_API_KEY,
    lastFetch,
    error: lastError || undefined,
  };
}

// Key energy series from EIA v2. Add more as needed.
const KEY_SERIES = [
  { id: "PET.WCESTUS1.W", name: "US Crude Oil Inventory (Weekly)", unit: "thousand bbl" },
  { id: "PET.WRSTUS1.W", name: "US Crude Oil Production (Weekly)", unit: "thousand bbl/day" },
  { id: "PET.WGTSTUS1.W", name: "US Gasoline Inventory (Weekly)", unit: "thousand bbl" },
  { id: "NG.NW2_EPG0_SWO_R48_BCF.W", name: "US Natural Gas Storage (Weekly)", unit: "billion cubic feet" },
  { id: "PET.RWTC.W", name: "WTI Spot Price (Daily)", unit: "$/bbl" },
  { id: "PET.RBRTE.W", name: "Brent Spot Price (Daily)", unit: "$/bbl" },
] as const;

async function eiaGet<T>(path: string): Promise<T | null> {
  const key = process.env.EIA_API_KEY;
  if (!key) {
    lastError = "EIA_API_KEY not set";
    return null;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${EIA_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${key}`;
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`EIA HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

interface EiaSeriesResponse {
  response: {
    data: Array<{
      period: string;
      value: number;
      [k: string]: unknown;
    }>;
    total: number;
  };
}

export async function fetchEiaSeries(seriesId: string, length = 30): Promise<EiaSeries | null> {
  try {
    const res = await eiaGet<EiaSeriesResponse>(
      `/${seriesId}?frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=${length}`
    );
    if (!res?.response?.data?.[0]) return null;
    const latest = res.response.data[0];
    const meta = KEY_SERIES.find((s) => s.id === seriesId);
    lastFetch = new Date().toISOString();
    lastError = null;
    return {
      id: seriesId,
      name: meta?.name || seriesId,
      period: latest.period,
      value: Number(latest.value),
      unit: meta?.unit || "",
      fetchedAt: lastFetch,
    };
  } catch (err) {
    lastError = (err as Error).message;
    logger.warn({ seriesId, err: lastError }, "eia fetch failed");
    return null;
  }
}

/** Fetch all key energy series in parallel. */
export async function fetchAllEiaSeries(): Promise<EiaSeries[]> {
  if (!process.env.EIA_API_KEY) return [];
  const results = await Promise.allSettled(KEY_SERIES.map((s) => fetchEiaSeries(s.id)));
  return results
    .filter((r): r is PromiseFulfilledResult<EiaSeries | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is EiaSeries => !!v);
}

export function listEiaSeries(): typeof KEY_SERIES {
  return KEY_SERIES;
}

export { CACHE_TTL_S as EIA_CACHE_TTL_S };
