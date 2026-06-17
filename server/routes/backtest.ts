/**
 * Backtest API routes.
 *
 * POST /api/backtest/run  — start a backtest (returns immediately with id)
 * GET  /api/backtest/:id  — get a backtest result (poll for completion)
 * GET  /api/backtest      — list user's recent backtests
 */
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { runBacktest, getBacktest, listBacktests } from "../services/trading/backtest";
import { logger } from "../lib/logger";

const router = Router();

const runSchema = z.object({
  strategy: z.enum(["Mean Reversion", "Momentum", "Buy & Hold"]),
  symbol: z.string().min(1).max(20),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  initialBalance: z.number().positive().max(10_000_000),
  params: z.object({
    lookback: z.number().int().min(2).max(200).optional(),
    threshold: z.number().min(0.001).max(0.5).optional(),
    holdDays: z.number().int().min(1).max(365).optional(),
    stopLossPct: z.number().min(0.001).max(0.5).optional(),
    takeProfitPct: z.number().min(0.001).max(1.0).optional(),
  }).optional(),
});

router.post("/run", authMiddleware, async (req, res) => {
  try {
    const parsed = runSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid input", status: 400 });
      return;
    }
    if (new Date(parsed.data.endDate) <= new Date(parsed.data.startDate)) {
      res.status(400).json({ code: "VALIDATION", message: "endDate must be after startDate", status: 400 });
      return;
    }
    const days = (new Date(parsed.data.endDate).getTime() - new Date(parsed.data.startDate).getTime()) / 86_400_000;
    if (days > 730) {
      res.status(400).json({ code: "VALIDATION", message: "Backtest period cannot exceed 2 years", status: 400 });
      return;
    }
    const { id, result } = await runBacktest(req.user!.userId, parsed.data);
    res.status(201).json({ id, status: "completed", result });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "backtest run failed");
    res.status(500).json({ code: "INTERNAL", message: "Backtest failed", status: 500 });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const list = await listBacktests(req.user!.userId, limit);
    res.json({ backtests: list });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to list backtests", status: 500 });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  const bt = await getBacktest(req.user!.userId, req.params.id);
  if (!bt) {
    res.status(404).json({ code: "NOT_FOUND", message: "Backtest not found", status: 404 });
    return;
  }
  res.json(bt);
});

export default router;
