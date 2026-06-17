/**
 * Trade journal — annotate trades with thesis, lessons, tags, rating.
 * GET    /api/journal          list user's entries
 * GET    /api/journal/:id      get one entry
 * POST   /api/journal          create entry
 * PUT    /api/journal/:id      update entry
 * DELETE /api/journal/:id      delete entry
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const journalSchema = z.object({
  orderId: z.string().optional(),
  symbol: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  thesis: z.string().max(2000).optional(),
  lessons: z.string().max(2000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  pnlAtNote: z.number().optional(),
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const entries = await db.select().from(schema.tradeJournal)
      .where(eq(schema.tradeJournal.userId, req.user!.userId))
      .orderBy(desc(schema.tradeJournal.createdAt))
      .execute();
    res.json({ entries, total: entries.length });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "journal list failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to load journal" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const parsed = journalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message });
    return;
  }
  try {
    const id = nanoid();
    await db.insert(schema.tradeJournal).values({
      id,
      userId: req.user!.userId,
      orderId: parsed.data.orderId,
      symbol: parsed.data.symbol,
      side: parsed.data.side,
      thesis: parsed.data.thesis,
      lessons: parsed.data.lessons,
      tags: parsed.data.tags,
      rating: parsed.data.rating,
      pnlAtNote: parsed.data.pnlAtNote?.toString(),
    }).execute();
    res.json({ id, message: "Journal entry created" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "journal create failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to create journal entry" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const parsed = journalSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message });
    return;
  }
  try {
    const result = await db.update(schema.tradeJournal)
      .set({
        thesis: parsed.data.thesis,
        lessons: parsed.data.lessons,
        tags: parsed.data.tags,
        rating: parsed.data.rating,
        pnlAtNote: parsed.data.pnlAtNote?.toString(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.tradeJournal.id, req.params.id), eq(schema.tradeJournal.userId, req.user!.userId)))
      .execute();
    if (result.rowCount === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Journal entry not found" });
      return;
    }
    res.json({ message: "Journal entry updated" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to update journal entry" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await db.delete(schema.tradeJournal)
      .where(and(eq(schema.tradeJournal.id, req.params.id), eq(schema.tradeJournal.userId, req.user!.userId)))
      .execute();
    if (result.rowCount === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Journal entry not found" });
      return;
    }
    res.json({ message: "Journal entry deleted" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to delete journal entry" });
  }
});

export default router;