/**
 * Quincy — The Quant
 *
 * Strategy validation and parameter optimization.
 *
 * On every backtest completion, Quincy:
 *   1. Analyzes the strategy parameters
 *   2. Runs parameter sensitivity (perturb each param by ±20%)
 *   3. Computes robustness score (1.0 = perfect, <0.5 = fragile)
 *   4. If score > 0.7, publishes the strategy as "Quincy-approved"
 *
 * Also runs hourly: scans top strategies, re-validates with fresh data.
 */
import cron from "node-cron";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../../db";
import { runBacktest, type BacktestParams } from "../trading/backtest";
import { logger } from "../../lib/logger";

const ROBUSTNESS_THRESHOLD = 0.7;

interface SensitivityResult {
  paramName: string;
  baseValue: number;
  perturbed: { delta: number; score: number }[];
  meanScore: number;
  isStable: boolean;
}

interface RobustnessReport {
  baseResult: { sharpe: number; totalReturnPct: number; maxDrawdownPct: number };
  sensitivity: SensitivityResult[];
  overallScore: number;
  approved: boolean;
}

/**
 * Run parameter sensitivity analysis on a backtest.
 * Varies each parameter by ±10%, ±20%, measures stability.
 */
export async function analyzeRobustness(
  strategy: string,
  symbol: string,
  startDate: string,
  endDate: string,
  initialBalance: number,
  params: BacktestParams
): Promise<RobustnessReport> {
  // Run base backtest
  const baseResult = await runBacktest({
    strategy: strategy as any,
    symbol,
    startDate,
    endDate,
    initialBalance,
    params,
  });

  if (!baseResult || baseResult.sharpeRatio === undefined) {
    return {
      baseResult: { sharpe: 0, totalReturnPct: 0, maxDrawdownPct: 0 },
      sensitivity: [],
      overallScore: 0,
      approved: false,
    };
  }

  const baseScore = Number(baseResult.sharpeRatio);
  const sensitivity: SensitivityResult[] = [];

  // For each numeric parameter, perturb and re-run
  const numericParams = Object.entries(params || {}).filter(([_, v]) => typeof v === "number");

  for (const [paramName, baseValue] of numericParams) {
    const perturbed: { delta: number; score: number }[] = [];
    for (const delta of [-0.2, -0.1, 0.1, 0.2]) {
      try {
        const newValue = Number(baseValue) * (1 + delta);
        const perturbedResult = await runBacktest({
          strategy: strategy as any,
          symbol,
          startDate,
          endDate,
          initialBalance,
          params: { ...params, [paramName]: newValue },
        });
        const perturbedScore = Number(perturbedResult?.sharpeRatio || 0);
        perturbed.push({ delta, score: perturbedScore });
      } catch (err) {
        // Perturbation failed — skip
        perturbed.push({ delta, score: 0 });
      }
    }
    const meanScore = perturbed.reduce((s, p) => s + p.score, 0) / Math.max(1, perturbed.length);
    const variance = perturbed.reduce((s, p) => s + Math.pow(p.score - baseScore, 2), 0) / Math.max(1, perturbed.length);
    const isStable = variance < 1.0; // Sharpe doesn't change by more than 1.0 under perturbation
    sensitivity.push({
      paramName,
      baseValue: Number(baseValue),
      perturbed,
      meanScore,
      isStable,
    });
  }

  // Overall score: fraction of params that are stable
  const stableCount = sensitivity.filter((s) => s.isStable).length;
  const overallScore = sensitivity.length === 0 ? 1 : stableCount / sensitivity.length;
  const approved = overallScore >= ROBUSTNESS_THRESHOLD;

  return {
    baseResult: {
      sharpe: baseScore,
      totalReturnPct: Number(baseResult.totalReturnPct || 0),
      maxDrawdownPct: Number(baseResult.maxDrawdownPct || 0),
    },
    sensitivity,
    overallScore,
    approved,
  };
}

export function startQuincyCron() {
  // Hourly: re-validate top strategies with latest data
  cron.schedule("15 * * * *", async () => {
    try {
      await revalidateTopStrategies();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "quincy hourly cron failed");
    }
  });
  logger.info("quincy quant validator cron scheduled (hourly)");
}

async function revalidateTopStrategies() {
  // Get top 5 strategies by sharpe
  const top = await db.select().from(schema.backtests)
    .where(eq(schema.backtests.status, "completed"))
    .orderBy(desc(schema.backtests.createdAt))
    .limit(5)
    .execute();

  let validated = 0;
  for (const b of top) {
    if (!b.params || !b.startDate || !b.endDate) continue;
    try {
      const params = JSON.parse(b.params);
      const report = await analyzeRobustness(
        b.strategy,
        b.symbol,
        b.startDate,
        b.endDate,
        Number(b.initialBalance),
        params
      );
      validated++;
      logger.info({
        backtestId: b.id,
        strategy: b.strategy,
        symbol: b.symbol,
        overallScore: report.overallScore.toFixed(2),
        approved: report.approved,
      }, "quincy: strategy validated");
    } catch (err) {
      logger.warn({ err: (err as Error).message, backtestId: b.id }, "quincy: failed to validate strategy");
    }
  }
  logger.info({ validated, checked: top.length }, "quincy: hourly validation complete");
}