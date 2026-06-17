/**
 * Strategy marketplace — publish, browse, clone public strategies.
 *
 * GET  /api/strategies/marketplace           - list published strategies
 * GET  /api/strategies/marketplace/:id       - get a published strategy
 * POST /api/strategies/custom/:id/publish    - publish your strategy
 * POST /api/strategies/custom/:id/clone      - clone someone else's
 * POST /api/strategies/custom/:id/rate       - rate (1-5 stars)
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/marketplace", authMiddleware, async (req, res) => {
  try {
    const { symbol, category, search } = req.query;
    const filters: any[] = [eq(schema.customStrategies.published, "true")];
    if (symbol) filters.push(eq(schema.customStrategies.symbol, String(symbol)));
    if (search) {
      const pattern = `%${search}%`;
      // LIKE on name + description
      const rows = await db.select().from(schema.customStrategies)
        .where(and(...filters, sql`(${schema.customStrategies.name} ILIKE ${pattern} OR ${schema.customStrategies.description} ILIKE ${pattern})`))
        .orderBy(desc(schema.customStrategies.clones), desc(schema.customStrategies.rating))
        .limit(50)
        .execute();
      res.json({ strategies: rows });
      return;
    }
    const rows = await db.select().from(schema.customStrategies)
      .where(and(...filters))
      .orderBy(desc(schema.customStrategies.clones), desc(schema.customStrategies.rating))
      .limit(50)
      .execute();
    res.json({ strategies: rows });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "marketplace list failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to list marketplace" });
  }
});

router.get("/marketplace/:id", authMiddleware, async (req, res) => {
  const rows = await db.select().from(schema.customStrategies)
    .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.published, "true")))
    .execute();
  if (rows.length === 0) {
    res.status(404).json({ code: "NOT_FOUND", message: "Strategy not found or not published" });
    return;
  }
  res.json(rows[0]);
});

router.post("/custom/:id/publish", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.customStrategies)
      .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.userId, req.user!.userId)))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Strategy not found" });
      return;
    }
    await db.update(schema.customStrategies)
      .set({ published: "true", updatedAt: new Date() })
      .where(eq(schema.customStrategies.id, req.params.id))
      .execute();
    res.json({ message: "Strategy published to marketplace" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to publish" });
  }
});

router.post("/custom/:id/unpublish", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.customStrategies)
      .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.userId, req.user!.userId)))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await db.update(schema.customStrategies)
      .set({ published: "false", updatedAt: new Date() })
      .where(eq(schema.customStrategies.id, req.params.id))
      .execute();
    res.json({ message: "Strategy unpublished" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/custom/:id/clone", authMiddleware, async (req, res) => {
  try {
    // Get the source strategy (must be published)
    const source = await db.select().from(schema.customStrategies)
      .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.published, "true")))
      .execute();
    if (source.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Strategy not found or not published" });
      return;
    }
    // Create a copy for the current user
    const newId = nanoid();
    const customName = (req.body?.name as string) || `${source[0].name} (clone)`;
    await db.insert(schema.customStrategies).values({
      id: newId,
      userId: req.user!.userId,
      name: customName,
      description: source[0].description,
      symbol: source[0].symbol,
      conditions: source[0].conditions,
      actions: source[0].actions,
      enabled: "false",
      published: "false",
    }).execute();
    // Increment clone count on source
    await db.update(schema.customStrategies)
      .set({ clones: sql`${schema.customStrategies.clones} + 1` })
      .where(eq(schema.customStrategies.id, req.params.id))
      .execute();
    logger.info({ userId: req.user!.userId, sourceId: req.params.id, newId }, "strategy cloned");
    res.status(201).json({ id: newId, message: "Strategy cloned to your account" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "clone failed");
    res.status(500).json({ code: "INTERNAL", message: "Clone failed" });
  }
});

const rateSchema = z.object({ rating: z.number().int().min(1).max(5) });

router.post("/custom/:id/rate", authMiddleware, async (req, res) => {
  try {
    const parsed = rateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "rating must be 1-5", status: 400 });
      return;
    }
    const rows = await db.select().from(schema.customStrategies)
      .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.published, "true")))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    // Simple average: increment rating by parsed.rating
    await db.update(schema.customStrategies)
      .set({ rating: sql`${schema.customStrategies.rating} + ${parsed.data.rating}` })
      .where(eq(schema.customStrategies.id, req.params.id))
      .execute();
    res.json({ message: "Rated" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL" });
  }
});

export default router;
