import { Router } from "express";
import { z } from "zod";
import { getEnergyNews } from "../services/data/newsCache";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  ticker: z.string().optional(),
  sentiment: z.enum(["bullish", "bearish", "neutral"]).optional(),
  source: z.enum(["newsapi", "gdelt", "mock"]).optional(),
});

/**
 * GET /api/news
 * Returns latest energy + finance news with sentiment.
 * Filters: ticker (WTI, NGAS, GOLD, ...), sentiment, source.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid query", status: 400 });
      return;
    }
    const { articles, source } = await getEnergyNews();
    let filtered = articles;
    if (parsed.data.ticker) {
      const t = parsed.data.ticker.toUpperCase();
      filtered = filtered.filter((a) => a.tickers.includes(t));
    }
    if (parsed.data.sentiment) {
      filtered = filtered.filter((a) => a.sentiment === parsed.data.sentiment);
    }
    if (parsed.data.source && parsed.data.source !== source) {
      // Caller asks for a different source than we have
      filtered = [];
    }
    if (parsed.data.limit) {
      filtered = filtered.slice(0, parsed.data.limit);
    }
    res.json({ articles: filtered, total: articles.length, source });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "news query failed");
    res.status(500).json({ code: "INTERNAL", message: "news query failed" });
  }
});

export default router;
