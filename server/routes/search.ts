/**
 * Search routes — fast full-text search via Meilisearch.
 * Falls back to DB query if Meilisearch is unavailable.
 */
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { search, isMeiliAvailable, INDEXES } from "../services/search/meilisearch";
import { db, schema } from "../db";
import { eq, and, desc, like, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const searchSchema = z.object({
  q: z.string().min(0).max(200),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  category: z.string().optional(),
  symbol: z.string().optional(),
  type: z.string().optional(),
});

router.get("/strategies", authMiddleware, async (req, res) => {
  try {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "Invalid query", status: 400 });
      return;
    }
    const filters: string[] = [];
    if (parsed.data.symbol) filters.push(`symbol = "${parsed.data.symbol}"`);
    if (parsed.data.category) filters.push(`category = "${parsed.data.category}"`);
    if (parsed.data.q.length === 0 && filters.length === 0) {
      // Empty query — return all custom strategies
      const rows = await db.select().from(schema.customStrategies)
        .where(eq(schema.customStrategies.userId, req.user!.userId))
        .orderBy(desc(schema.customStrategies.createdAt))
        .limit(parsed.data.limit || 20)
        .execute();
      return res.json({ hits: rows, engine: "db" });
    }
    if (await isMeiliAvailable()) {
      const hits = await search("strategies", parsed.data.q, filters.join(" AND ") || undefined, parsed.data.limit || 20);
      return res.json({ hits, engine: "meilisearch" });
    }
    // Fallback to DB
    const pattern = `%${parsed.data.q}%`;
    const rows = await db.select().from(schema.customStrategies)
      .where(and(
        eq(schema.customStrategies.userId, req.user!.userId),
        or(
          like(schema.customStrategies.name, pattern),
          like(schema.customStrategies.description, pattern),
        ),
      ))
      .limit(parsed.data.limit || 20)
      .execute();
    res.json({ hits: rows, engine: "db" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "search strategies failed");
    res.status(500).json({ code: "INTERNAL", message: "Search failed" });
  }
});

router.get("/news", authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (await isMeiliAvailable()) {
      const hits = await search("news", q, undefined, 20);
      return res.json({ hits, engine: "meilisearch" });
    }
    res.json({ hits: [], engine: "db", message: "Search not available" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "News search failed" });
  }
});

router.get("/signals", authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (await isMeiliAvailable()) {
      const hits = await search("signals", q, undefined, 20);
      return res.json({ hits, engine: "meilisearch" });
    }
    res.json({ hits: [], engine: "db", message: "Search not available" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Signal search failed" });
  }
});

router.get("/status", authMiddleware, async (_req, res) => {
  res.json({
    available: await isMeiliAvailable(),
    indexes: Object.values(INDEXES),
  });
});

export default router;
