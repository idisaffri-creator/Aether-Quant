import { Router } from "express";
import type { MarketData, OrderBook, Candle } from "../../shared/types";
import { getQuotes, getCandles } from "../services/data/quoteCache";
import { logger } from "../lib/logger";
import { marketLimiter } from "../middleware/rateLimit";

const router = Router();

const KNOWN_SYMBOLS = new Set([
  "WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL",
]);

router.get("/quotes", marketLimiter, async (_req, res) => {
  try {
    const quotes = await getQuotes();
    // Strip internal _mock flag before sending
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
  const symbol = req.params.symbol.toUpperCase();
  if (!KNOWN_SYMBOLS.has(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }
  try {
    const quotes = await getQuotes();
    const q = quotes.find((x) => x.symbol === symbol);
    if (!q) {
      res.status(404).json({ code: "NOT_FOUND", message: `Quote for ${symbol} not available`, status: 404 });
      return;
    }
    const { ...clean } = q as any;
    res.json(clean as MarketData);
  } catch (err) {
    logger.error({ err: (err as Error).message, symbol }, "quote failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to fetch quote" });
  }
});

router.get("/orderbook/:symbol", (req, res) => {
  // Orderbook is exchange-grade data and requires paid feed (dxFeed, etc.).
  // Until then, return 501 with a clear message.
  res.status(501).json({
    code: "NOT_IMPLEMENTED",
    message: "Order book requires a paid L2 data feed (e.g. dxFeed, Polygon paid tier). Coming soon.",
    status: 501,
  });
});

router.get("/history/:symbol", marketLimiter, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;

  // Validate resolution
  const valid = ["1m", "5m", "15m", "1h", "1d"];
  if (!valid.includes(resolution)) {
    res.status(400).json({ code: "VALIDATION", message: "resolution must be 1m, 5m, 15m, 1h, or 1d", status: 400 });
    return;
  }
  // Map resolution to range so we get enough candles
  const range = count <= 24 ? "1d" : count <= 100 ? "5d" : "1mo";
  const interval = resolution === "1d" ? "1d" : resolution as "1m" | "5m" | "15m" | "1h";

  try {
    const candles = await getCandles(symbol, interval, range as any);
    // Trim to requested count
    res.json(candles.slice(-count));
  } catch (err) {
    logger.error({ err: (err as Error).message, symbol }, "candles failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to fetch candles" });
  }
});

export default router;
