/**
 * Backtest API routes.
 * POST /api/backtest/run       - enqueue job (returns jobId immediately)
 * GET  /api/backtest/job/:id    - poll job status + result
 * GET  /api/backtest/:id        - get persisted backtest result
 * GET  /api/backtest            - list user's backtests
 */
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { getBacktest, listBacktests } from "../services/trading/backtest";
import { enqueueBacktest, getBacktestJob } from "../services/queue/backtestQueue";
import { db, schema } from "../db";
import { eq, and, desc } from "drizzle-orm";
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

/**
 * Enqueue a backtest. Returns immediately with { jobId, status: "queued" }.
 * UI polls /api/backtest/job/:id for status + result.
 */
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
    const jobId = await enqueueBacktest({ userId: req.user!.userId, input: parsed.data });
    res.status(202).json({ jobId, status: "queued" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "backtest enqueue failed");
    res.status(500).json({ code: "INTERNAL", message: "Backtest enqueue failed" });
  }
});

/**
 * Poll a backtest job for status + result.
 */
router.get("/job/:id", authMiddleware, async (req, res) => {
  try {
    const job = await getBacktestJob(req.params.id);
    if (!job) {
      res.status(404).json({ code: "NOT_FOUND", message: "Job not found or expired" });
      return;
    }
    res.json(job);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "job status failed");
    res.status(500).json({ code: "INTERNAL", message: "Job status failed" });
  }
});

/**
 * Get a persisted backtest result (by backtest id, not job id).
 */
router.get("/:id", authMiddleware, async (req, res) => {
  const bt = await getBacktest(req.user!.userId, req.params.id);
  if (!bt) {
    res.status(404).json({ code: "NOT_FOUND", message: "Backtest not found", status: 404 });
    return;
  }
  res.json(bt);
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const list = await listBacktests(req.user!.userId, limit);
    res.json({ backtests: list });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to list backtests" });
  }
});

export default router;
