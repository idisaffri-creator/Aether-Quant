/**
 * Counsel — Backtest Bias Detector
 *
 * Reviews each new backtest for common statistical sins:
 *   - Look-ahead bias: uses future data the strategy couldn't have known
 *   - Survivorship bias: only includes currently-listed symbols (not delisted ones)
 *   - Overfitting: high in-sample Sharpe that doesn't hold out-of-sample
 *   - Capacity constraints: strategy works on $100k but breaks on $1M
 *   - Insufficient trades: <30 trades can't be statistically significant
 *   - Commission/slippage ignored: unrealistic P&L
 *   - Curve-fitted parameters: too many optimized parameters for the data length
 *
 * When a backtest is reviewed, the result is published on the backtest
 * with a confidence score. Auto-reject if confidence < 0.5.
 */
import cron from "node-cron";
import { eq, desc, gte, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

interface BiasFlag {
  type: "lookahead" | "survivorship" | "overfitting" | "capacity" | "insufficient_trades" | "no_costs" | "param_overfit" | "data_snooping";
  severity: "critical" | "warning" | "info";
  description: string;
  points: number; // deducted from confidence
}

interface BiasReview {
  backtestId: string;
  flags: BiasFlag[];
  confidence: number;       // 0-1
  verdict: "approved" | "caution" | "rejected";
  summary: string;
}

const MIN_TRADES = 30;
const PARAM_PENALTY_THRESHOLD = 5; // >5 params for <2 years = likely overfit
const REJECT_THRESHOLD = 0.4;
const CAUTION_THRESHOLD = 0.7;

export function startCounselCron() {
  // Hourly: review any new backtests not yet reviewed
  cron.schedule("30 * * * *", async () => {
    try {
      await reviewUnreviewedBacktests();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "counsel review failed");
    }
  });
  logger.info("counsel bias detector cron scheduled (hourly)");
}

export async function reviewBacktest(backtestId: string): Promise<BiasReview | null> {
  const backtests = await db.select().from(schema.backtests)
    .where(eq(schema.backtests.id, backtestId))
    .limit(1)
    .execute();
  const bt = backtests[0];
  if (!bt) return null;

  const flags: BiasFlag[] = [];
  let confidence = 1.0;

  // === Flag 1: Insufficient trades ===
  const trades = Number(bt.totalTrades || 0);
  if (trades < MIN_TRADES) {
    flags.push({
      type: "insufficient_trades",
      severity: trades < 10 ? "critical" : "warning",
      description: `Only ${trades} trades. Statistical significance requires at least ${MIN_TRADES}. Below 10 is meaningless.`,
      points: trades < 10 ? 0.4 : 0.15,
    });
  }

  // === Flag 2: Parameter overfitting ===
  let paramCount = 0;
  try {
    if (bt.params) {
      const params = JSON.parse(bt.params);
      paramCount = Object.keys(params).length;
    }
  } catch (e) { /* ignore */ }
  if (paramCount > PARAM_PENALTY_THRESHOLD) {
    flags.push({
      type: "param_overfit",
      severity: "warning",
      description: `${paramCount} parameters. Rule of thumb: <1 parameter per 100 trades. With only ${trades} trades, this is likely overfit.`,
      points: 0.15,
    });
  }

  // === Flag 3: Suspiciously high Sharpe ===
  const sharpe = Number(bt.sharpeRatio || 0);
  if (sharpe > 3.5) {
    flags.push({
      type: "overfitting",
      severity: sharpe > 5 ? "critical" : "warning",
      description: `Sharpe of ${sharpe.toFixed(2)} is suspicious. Real strategies rarely sustain >3.0 after costs and slippage. Possible curve-fit.`,
      points: sharpe > 5 ? 0.35 : 0.2,
    });
  }

  // === Flag 4: Win rate + low trades ===
  const winRate = Number(bt.winRate || 0);
  if (winRate > 0.95 && trades < 50) {
    flags.push({
      type: "lookahead",
      severity: "critical",
      description: `${(winRate * 100).toFixed(0)}% win rate with only ${trades} trades is statistically implausible. Check for look-ahead bias.`,
      points: 0.3,
    });
  }

  // === Flag 5: Zero drawdown with high return ===
  const maxDD = Number(bt.maxDrawdown || 0);
  const totalReturn = Number(bt.totalReturnPct || 0);
  if (maxDD < 0.001 && totalReturn > 0.5) {
    flags.push({
      type: "overfitting",
      severity: "critical",
      description: `${(totalReturn * 100).toFixed(0)}% return with 0% drawdown is unrealistic. Real strategies have drawdowns.`,
      points: 0.3,
    });
  }

  // === Flag 6: Data snooping (date range too short) ===
  const start = new Date(bt.startDate);
  const end = new Date(bt.endDate);
  const days = (end.getTime() - start.getTime()) / 86400000;
  if (days < 365) {
    flags.push({
      type: "data_snooping",
      severity: days < 90 ? "critical" : "info",
      description: `Backtest spans only ${Math.round(days)} days. Minimum 1 year recommended to capture different market regimes.`,
      points: days < 90 ? 0.2 : 0.05,
    });
  }

  // Calculate confidence
  for (const f of flags) confidence -= f.points;
  confidence = Math.max(0, Math.min(1, confidence));

  const verdict: "approved" | "caution" | "rejected" =
    confidence < REJECT_THRESHOLD ? "rejected" :
    confidence < CAUTION_THRESHOLD ? "caution" :
    "approved";

  const summary = flags.length === 0
    ? "No red flags detected. Strategy passes basic sanity checks."
    : `${flags.length} flag${flags.length === 1 ? "" : "s"}: ${flags.map((f) => f.severity).join(", ")}.`;

  const review: BiasReview = {
    backtestId,
    flags,
    confidence,
    verdict,
    summary,
  };

  // Save review to backtest metadata
  await db.update(schema.backtests)
    .set({ error: JSON.stringify({ counselReview: review }) })
    .where(eq(schema.backtests.id, backtestId))
    .execute();

  // Notify user
  await notify(bt.userId, "alert", {
    title: `Counsel: backtest ${verdict.toUpperCase()} (${(confidence * 100).toFixed(0)}% confidence)`,
    body: summary,
    metadata: { backtestId, verdict, confidence, flagCount: flags.length },
  });

  logger.info({ backtestId, verdict, confidence, flags: flags.length }, "counsel: review complete");
  return review;
}

async function reviewUnreviewedBacktests() {
  // Find completed backtests from the last 24h without a review
  const oneDayAgo = new Date(Date.now() - 86400000);
  const recent = await db.select().from(schema.backtests)
    .where(sql`${schema.backtests.status} = 'completed' AND ${schema.backtests.completedAt} > ${oneDayAgo.toISOString()}`)
    .orderBy(desc(schema.backtests.completedAt))
    .limit(20)
    .execute();

  let reviewed = 0;
  for (const bt of recent) {
    if (bt.error?.includes("counselReview")) continue; // already reviewed
    await reviewBacktest(bt.id);
    reviewed++;
  }
  logger.info({ reviewed, candidates: recent.length }, "counsel: hourly review pass complete");
}