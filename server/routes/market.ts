import { Router } from "express";
import type { MarketData, OrderBook, Candle } from "../../shared/types";
import { getQuotes, getCandles } from "../services/data/quoteCache";
import { logger } from "../lib/logger";
import { marketLimiter } from "../middleware/rateLimit";

const router = Router();

// Symbol aliases — UI uses short codes (CL, BZ, NG...) but quotes are stored
// under the full name (WTI, BRENT, NGAS...). Resolve either form to canonical.
const SYMBOL_ALIASES: Record<string, string> = {
  // Short codes → canonical
  CL: "WTI",
  BZ: "BRENT",
  NG: "NGAS",
  GC: "GOLD",
  SI: "SILVER",
  HG: "COPPER",
  HO: "HEATOIL",
  RB: "GASOL",
  ZW: "WHEAT",
  ES: "ES",
  // Canonical names pass through
  WTI: "WTI",
  BRENT: "BRENT",
  NGAS: "NGAS",
  GOLD: "GOLD",
  SILVER: "SILVER",
  COPPER: "COPPER",
  HEATOIL: "HEATOIL",
  GASOL: "GASOL",
  WHEAT: "WHEAT",
};

function resolveSymbol(s: string): string | null {
  const upper = s.toUpperCase();
  return SYMBOL_ALIASES[upper] || null;
}

router.get("/quotes", marketLimiter, async (_req, res) => {
  try {
    const quotes = await getQuotes();
    const cleaned = quotes.map(({ ...q }) => {
      delete (q as any)._mock;
      return q as MarketData;
    });
    res.json(cleaned);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "quotes failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to fetch quotes" });
  }
});

router.get("/quotes/:symbol", marketLimiter, async (req, res) => {
  const requested = req.params.symbol.toUpperCase();
  const canonical = resolveSymbol(requested);
  if (!canonical) {
    res.status(404).json({
      code: "NOT_FOUND",
      message: `Unknown symbol "${requested}". Valid: CL, BZ, NG, GC, SI, HG, HO, RB, ZW, ES (or full names WTI, BRENT, NGAS, GOLD, SILVER, COPPER, HEATOIL, GASOL, WHEAT)`,
      status: 404,
    });
    return;
  }
  try {
    const quotes = await getQuotes();
    // Try canonical first, fall back to short code (in case cache stores CL instead of WTI)
    let q = quotes.find((x) => x.symbol === canonical);
    if (!q) q = quotes.find((x) => x.symbol === requested);
    if (!q) {
      res.status(404).json({ code: "NOT_FOUND", message: `Quote for ${requested} not available`, status: 404 });
      return;
    }
    const { ...clean } = q as any;
    res.json(clean as MarketData);
  } catch (err) {
    logger.error({ err: (err as Error).message, symbol: requested }, "quote failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to fetch quote" });
  }
});

router.get("/orderbook/:symbol", (req, res) => {
  res.status(501).json({
    code: "NOT_IMPLEMENTED",
    message: "Order book requires a paid L2 data feed (e.g. dxFeed, Polygon paid tier). Coming soon.",
    status: 501,
  });
});

router.get("/history/:symbol", marketLimiter, async (req, res) => {
  const requested = req.params.symbol.toUpperCase();
  const canonical = resolveSymbol(requested);
  if (!canonical) {
    res.status(404).json({ code: "NOT_FOUND", message: `Unknown symbol "${requested}"`, status: 404 });
    return;
  }
  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;

  const valid = ["1m", "5m", "15m", "1h", "1d"];
  if (!valid.includes(resolution)) {
    res.status(400).json({ code: "VALIDATION", message: "resolution must be 1m, 5m, 15m, 1h, or 1d", status: 400 });
    return;
  }
  const range = count <= 24 ? "1d" : count <= 100 ? "5d" : "1mo";
  const interval = resolution === "1d" ? "1d" : resolution as "1m" | "5m" | "15m" | "1h";

  try {
    const candles = await getCandles(canonical, interval, range as any);
    res.json(candles.slice(-count));
  } catch (err) {
    logger.error({ err: (err as Error).message, symbol: requested }, "candles failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to fetch candles" });
  }
});

export default router;