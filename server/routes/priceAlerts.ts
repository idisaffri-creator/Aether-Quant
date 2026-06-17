/**
 * Price alerts — notify user when a symbol hits a target price.
 * Worker in services/cron/priceAlerts.ts checks quotes every minute.
 *
 * GET    /api/alerts/price          list user's alerts
 * POST   /api/alerts/price          create alert
 * DELETE /api/alerts/price/:id      delete alert
 * PATCH  /api/alerts/price/:id      enable/disable
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const alertSchema = z.object({
  symbol: z.string().min(1).max(20),
  condition: z.enum(["above", "below", "crosses"]),
  threshold: z.number().positive(),
  triggerOnce: z.boolean().optional().default(true),
  notifyEmail: z.boolean().optional().default(false),
  notifyDiscord: z.boolean().optional().default(false),
});

router.get("/price", authMiddleware, async (req, res) => {
  try {
    const alerts = await db.select().from(schema.priceAlerts)
      .where(eq(schema.priceAlerts.userId, req.user!.userId))
      .orderBy(desc(schema.priceAlerts.createdAt))
      .execute();
    res.json({ alerts, total: alerts.length });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load alerts" });
  }
});

router.post("/price", authMiddleware, async (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message });
    return;
  }
  try {
    // Cap at 50 alerts per user to prevent abuse
    const existing = await db.select({ id: schema.priceAlerts.id })
      .from(schema.priceAlerts)
      .where(eq(schema.priceAlerts.userId, req.user!.userId))
      .execute();
    if (existing.length >= 50) {
      res.status(400).json({ code: "LIMIT", message: "Maximum 50 active alerts per user" });
      return;
    }
    const id = nanoid();
    await db.insert(schema.priceAlerts).values({
      id,
      userId: req.user!.userId,
      symbol: parsed.data.symbol.toUpperCase(),
      condition: parsed.data.condition,
      threshold: parsed.data.threshold.toString(),
      active: 1,
      triggerOnce: parsed.data.triggerOnce ? 1 : 0,
      notifyEmail: parsed.data.notifyEmail ? 1 : 0,
      notifyDiscord: parsed.data.notifyDiscord ? 1 : 0,
    }).execute();
    res.json({ id, message: "Alert created" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to create alert" });
  }
});

router.patch("/price/:id", authMiddleware, async (req, res) => {
  try {
    const { active } = req.body;
    const result = await db.update(schema.priceAlerts)
      .set({ active: active ? 1 : 0 })
      .where(and(eq(schema.priceAlerts.id, req.params.id), eq(schema.priceAlerts.userId, req.user!.userId)))
      .execute();
    if (result.rowCount === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Alert not found" });
      return;
    }
    res.json({ message: active ? "Alert enabled" : "Alert disabled" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to update alert" });
  }
});

router.delete("/price/:id", authMiddleware, async (req, res) => {
  try {
    const result = await db.delete(schema.priceAlerts)
      .where(and(eq(schema.priceAlerts.id, req.params.id), eq(schema.priceAlerts.userId, req.user!.userId)))
      .execute();
    if (result.rowCount === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Alert not found" });
      return;
    }
    res.json({ message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to delete alert" });
  }
});

export default router;