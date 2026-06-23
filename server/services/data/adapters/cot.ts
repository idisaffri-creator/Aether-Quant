/**
 * CFTC Commitment of Traders (COT) adapter — free, no key required.
 * Parses weekly COT data from CFTC website for energy/commodity positioning.
 *
 * Key signals:
 *   - Commercials (hedgers) net position → smart money directional bias
 *   - Managed Money (speculators) net position → crowd positioning
 *   - Net speculative positioning extremes → contrarian reversal signals
 *   - Weekly changes in positioning → trend momentum
 *
 * Data source: https://www.cftc.gov/dea/futures/other_lf.htm (updated weekly, Tuesdays)
 */
import { logger } from "../../../lib/logger";

const CFTC_URLS = [
  "https://www.cftc.gov/dea/futures/other_lf.htm",  // Metals/other
  "https://www.cftc.gov/dea/futures/lf.htm",         // Legacy energy
];
const TIMEOUT_MS = 15000;

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getCotStatus() {
  return {
    healthy: lastError === null,
    latencyMs: lastLatencyMs,
    lastFetch,
    error: lastError || undefined,
  };
}

export interface CotPosition {
  commodity: string;
  exchange: string;
  reportDate: string;
  openInterest: number;
  commercials: { long: number; short: number; net: number; pctLong: number };
  managedMoney: { long: number; short: number; net: number; pctLong: number };
  otherReportables: { long: number; short: number; net: number };
  nonReportable: { long: number; short: number; net: number };
  netSpecPosition: number;
  signal: "extreme_long" | "extreme_short" | "neutral";
}

function parseNumbers(text: string): number[] {
  return text.replace(/,/g, "").trim().split(/\s+/).map(Number).filter((n) => !isNaN(n));
}

function parseCotHtml(html: string): CotPosition[] {
  const positions: CotPosition[] = [];
  // Split by commodity sections
  const sections = html.split(/([A-Z][A-Z0-9\s\-]+(?:-[ A-Z0-9]+)?)\s*-\s*([A-Z\s]+\.EXCHANGE INC\.|NEW YORK MERCANTILE EXCHANGE|CHICAGO MERCANTILE EXCHANGE)/i);

  // Simpler approach: find all "All :" lines with numbers
  const allLines = html.match(/All\s*:\s*[\d,]+\s*:.*/g) || [];

  // Extract report date from header
  const dateMatch = html.match(/(?:Commitments of Traders|Disaggregated Commitments of Traders)[^,]*,\s*(?:June|May|April|March|February|January|July|August|September|October|November|December)\s+\d+,\s+\d{4}/i);
  const reportDate = dateMatch ? dateMatch[0].match(/\w+\s+\d+,\s+\d{4}/)?.[0] || "" : "";

  // Find commodity names and their data
  const commodityBlocks = html.split(/(?=Code-\d{5,6})/);

  for (const block of commodityBlocks) {
    try {
      // Extract commodity name
      const nameMatch = block.match(/^Code-\d+\s*\n([A-Z][A-Z0-9\s\-]+?)(?:\s*-\s*|$)/m);
      const exchangeMatch = block.match(/-\s*(NEW YORK MERCANTILE EXCHANGE|CHICAGO MERCANTILE EXCHANGE|COMMODITY EXCHANGE INC)/i);
      if (!nameMatch) continue;

      const commodity = nameMatch[1].trim();
      const exchange = exchangeMatch?.[1] || "";

      // Find the "All :" line with positions
      const allMatch = block.match(/All\s*:\s*([\d,]+)\s*:\s*([\d,\s\-]+):\s*([\d,\s\-]+):/);
      if (!allMatch) continue;

      const openInterest = parseInt(allMatch[1].replace(/,/g, ""), 10);
      const afterOI = allMatch[2] + " " + allMatch[3];
      const nums = parseNumbers(afterOI);

      if (nums.length < 12) continue;

      const commercialsLong = nums[0] || 0;
      const commercialsShort = nums[1] || 0;
      const swapLong = nums[2] || 0;
      const swapShort = nums[3] || 0;
      const managedMoneyLong = nums[5] || 0;
      const managedMoneyShort = nums[6] || 0;
      const otherLong = nums[8] || 0;
      const otherShort = nums[9] || 0;

      const commercials = {
        long: commercialsLong,
        short: commercialsShort,
        net: commercialsLong - commercialsShort,
        pctLong: openInterest > 0 ? Math.round((commercialsLong / openInterest) * 1000) / 10 : 0,
      };
      const managedMoney = {
        long: managedMoneyLong,
        short: managedMoneyShort,
        net: managedMoneyLong - managedMoneyShort,
        pctLong: openInterest > 0 ? Math.round((managedMoneyLong / openInterest) * 1000) / 10 : 0,
      };
      const otherReportables = {
        long: otherLong,
        short: otherShort,
        net: otherLong - otherShort,
      };

      const netSpecPosition = managedMoney.net;
      let signal: CotPosition["signal"] = "neutral";
      if (netSpecPosition > openInterest * 0.3) signal = "extreme_long";
      else if (netSpecPosition < -openInterest * 0.3) signal = "extreme_short";

      positions.push({
        commodity,
        exchange,
        reportDate,
        openInterest,
        commercials,
        managedMoney,
        otherReportables,
        nonReportable: { long: 0, short: 0, net: 0 },
        netSpecPosition,
        signal,
      });
    } catch {
      // Skip malformed sections
    }
  }
  return positions;
}

// Track known energy/commodity CFTC codes
const TRACKED_COMMODITIES = [
  "CRUDE OIL",
  "NY HARBOR",
  "NATURAL GAS",
  "HEATING OIL",
  "GASOLINE",
  "GOLD",
  "SILVER",
  "COPPER",
  "PLATINUM",
  "PALLADIUM",
];

let cachedPositions: CotPosition[] = [];

/**
 * Fetch and parse COT data from CFTC.
 * Note: CFTC updates weekly (Tuesdays), so we cache aggressively.
 */
export async function fetchCotData(): Promise<CotPosition[]> {
  if (cachedPositions.length > 0) {
    // Re-fetch at most once per hour (COT data is weekly)
    const age = lastFetch ? Date.now() - new Date(lastFetch).getTime() : Infinity;
    if (age < 3600_000) return cachedPositions;
  }

  const t0 = Date.now();
  try {
    const allPositions: CotPosition[] = [];
    for (const url of CFTC_URLS) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        const r = await fetch(url, {
          headers: { Accept: "text/html" },
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!r.ok) continue;
        const html = await r.text();
        const positions = parseCotHtml(html);
        allPositions.push(...positions);
      } catch {
        // Skip failed URLs
      }
    }

    // Filter to tracked commodities
    const filtered = allPositions.filter((p) =>
      TRACKED_COMMODITIES.some((t) => p.commodity.includes(t))
    );

    lastFetch = new Date().toISOString();
    lastError = filtered.length > 0 ? null : "no positions parsed";
    lastLatencyMs = Date.now() - t0;

    if (filtered.length > 0) {
      cachedPositions = filtered;
      logger.debug({ count: filtered.length, ms: lastLatencyMs }, "cot data fetched");
    }
    return filtered;
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    return cachedPositions;
  }
}

/**
 * Get COT data for a specific commodity.
 */
export async function fetchCotForCommodity(name: string): Promise<CotPosition | null> {
  const positions = await fetchCotData();
  return positions.find((p) => p.commodity.toUpperCase().includes(name.toUpperCase())) || null;
}
