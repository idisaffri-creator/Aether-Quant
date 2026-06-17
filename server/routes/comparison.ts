/**
 * Strategy comparison — compare multiple backtests side by side.
 * Returns aggregated metrics, equity curves normalized, and rankings.
 */
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { getBacktest } from "../services/trading/backtest";
import { db, schema } from "../db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const compareSchema = z.object({
  ids: z.array(z.string().min(1)).min(2).max(10),
});

router.post("/compare", authMiddleware, async (req, res) => {
  try {
    const parsed = compareSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "Need 2-10 backtest ids", status: 400 });
      return;
    }
    // Load all backtests (scoped to user)
    const results = [];
    for (const id of parsed.data.ids) {
      const bt = await getBacktest(req.user!.userId, id);
      if (bt) results.push(bt);
    }
    if (results.length < 2) {
      res.status(404).json({ code: "NOT_FOUND", message: "Not enough valid backtests found", status: 404 });
      return;
    }
    // Aggregate
    const comparison = {
      count: results.length,
      backtests: results.map(bt => ({
        id: bt.id,
        strategy: bt.strategy,
        symbol: bt.symbol,
        startDate: bt.startDate,
        endDate: bt.endDate,
        initialBalance: bt.initialBalance,
        finalEquity: bt.finalEquity,
        totalReturn: bt.totalReturn,
        totalReturnPct: bt.totalReturnPct,
        sharpeRatio: bt.sharpeRatio,
        maxDrawdown: bt.maxDrawdown,
        maxDrawdownPct: bt.maxDrawdownPct,
        winRate: bt.winRate,
        totalTrades: bt.totalTrades,
        status: bt.status,
        createdAt: bt.createdAt,
        result: bt.result,
      })),
      rankings: rankBacktests(results),
      best: pickBest(results),
    };
    res.json(comparison);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "comparison failed");
    res.status(500).json({ code: "INTERNAL", message: "Comparison failed" });
  }
});

function rankBacktests(bts: any[]): Record<string, number> {
  // Higher is better: sharpe, totalReturn, winRate
  // Lower is better: maxDrawdownPct
  const ranks: Record<string, Record<string, number>> = {};
  const metrics = ["sharpeRatio", "totalReturnPct", "winRate"];
  for (const m of metrics) {
    const sorted = [...bts].sort((a, b) => (b[m] || 0) - (a[m] || 0));
    sorted.forEach((bt, i) => {
      if (!ranks[bt.id]) ranks[bt.id] = {};
      ranks[bt.id][m] = i + 1;
    });
  }
  // Lower is better
  const sortedDD = [...bts].sort((a, b) => (a.maxDrawdownPct || 0) - (b.maxDrawdownPct || 0));
  sortedDD.forEach((bt, i) => {
    if (!ranks[bt.id]) ranks[bt.id] = {};
    ranks[bt.id].maxDrawdownPct = i + 1;
  });
  // Average rank
  const out: Record<string, number> = {};
  for (const id of Object.keys(ranks)) {
    const ranks_arr = Object.values(ranks[id]);
    out[id] = ranks_arr.reduce((a, b) => a + b, 0) / ranks_arr.length;
  }
  return out;
}

function pickBest(bts: any[]): { id: string; score: number; reason: string } {
  // Composite score: sharpe (40%) + return (30%) - drawdown (30%)
  let best = bts[0];
  let bestScore = -Infinity;
  for (const bt of bts) {
    const sharpe = bt.sharpeRatio || 0;
    const ret = bt.totalReturnPct || 0;
    const dd = bt.maxDrawdownPct || 0;
    const score = sharpe * 0.4 + ret * 100 * 0.3 - dd * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = bt;
    }
  }
  return {
    id: best.id,
    score: bestScore,
    reason: `Composite score: ${bestScore.toFixed(3)} (Sharpe ${(best.sharpeRatio || 0).toFixed(2)} × 0.4 + return ${((best.totalReturnPct || 0) * 100).toFixed(1)}% × 0.3 - drawdown ${((best.maxDrawdownPct || 0) * 100).toFixed(1)}% × 0.3)`,
  };
}

export default router;
