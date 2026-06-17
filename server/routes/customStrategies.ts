/**
 * Custom strategy CRUD routes.
 * Users can define their own strategies and run them via the strategy runner.
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const conditionSchema = z.object({
  indicator: z.enum(["rsi", "macd", "price_change", "volume_spike", "moving_average_cross"]),
  threshold: z.number(),
  comparison: z.enum(["gt", "lt"]),
  lookback: z.number().int().min(2).max(200).optional(),
});

const actionSchema = z.object({
  type: z.enum(["buy", "sell"]),
  quantity: z.number().positive().max(1000),
  orderType: z.enum(["market", "limit"]).default("market"),
  limitOffsetPct: z.number().min(-0.1).max(0.1).optional(),
});

const strategySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  symbol: z.string().min(1).max(20),
  conditions: z.array(conditionSchema).min(1).max(10),
  actions: z.array(actionSchema).min(1).max(5),
  enabled: z.boolean().default(true),
});

router.get("/custom", authMiddleware, async (req, res) => {
  const rows = await db.select().from(schema.customStrategies)
    .where(eq(schema.customStrategies.userId, req.user!.userId))
    .orderBy(desc(schema.customStrategies.createdAt))
    .execute();
  res.json({
    strategies: rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      symbol: r.symbol,
      conditions: JSON.parse(r.conditions),
      actions: JSON.parse(r.actions),
      enabled: r.enabled === "true",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

router.post("/custom", authMiddleware, async (req, res) => {
  try {
    const parsed = strategySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid strategy", status: 400 });
      return;
    }
    const id = nanoid();
    await db.insert(schema.customStrategies).values({
      id,
      userId: req.user!.userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      symbol: parsed.data.symbol,
      conditions: JSON.stringify(parsed.data.conditions),
      actions: JSON.stringify(parsed.data.actions),
      enabled: parsed.data.enabled ? "true" : "false",
    }).execute();
    logger.info({ userId: req.user!.userId, id, name: parsed.data.name }, "custom strategy created");
    res.status(201).json({ id, message: "Strategy created" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "create strategy failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to create strategy", status: 500 });
  }
});

router.put("/custom/:id", authMiddleware, async (req, res) => {
  try {
    const parsed = strategySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "Invalid update", status: 400 });
      return;
    }
    const existing = await db.select().from(schema.customStrategies)
      .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.userId, req.user!.userId)))
      .execute();
    if (existing.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Strategy not found", status: 404 });
      return;
    }
    const updates: any = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.symbol !== undefined) updates.symbol = parsed.data.symbol;
    if (parsed.data.conditions !== undefined) updates.conditions = JSON.stringify(parsed.data.conditions);
    if (parsed.data.actions !== undefined) updates.actions = JSON.stringify(parsed.data.actions);
    if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled ? "true" : "false";
    await db.update(schema.customStrategies)
      .set(updates)
      .where(eq(schema.customStrategies.id, req.params.id))
      .execute();
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Update failed", status: 500 });
  }
});

router.delete("/custom/:id", authMiddleware, async (req, res) => {
  await db.delete(schema.customStrategies)
    .where(and(eq(schema.customStrategies.id, req.params.id), eq(schema.customStrategies.userId, req.user!.userId)))
    .execute();
  res.json({ message: "Deleted" });
});

export default router;
