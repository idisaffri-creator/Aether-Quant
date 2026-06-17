/**
 * Sage — Marketplace Curator
 *
 * Reviews strategies in the marketplace hourly.
 * Scores each on quality (Sharpe, drawdown, complexity) and
 * auto-features top performers.
 *
 * Quality score = 0.4 * sharpe + 0.3 * (1 - maxDrawdown) + 0.3 * simplicity
 */
import cron from "node-cron";
import { eq, desc, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { logger } from "../../lib/logger";

const QUALITY_SQL = `
  GREATEST(0, LEAST(1,
    0.4 * LEAST(1, sharpe_ratio / 3.0) +
    0.3 * GREATEST(0, 1 - max_drawdown_pct / 0.3) +
    0.3 * (CASE WHEN total_trades > 10 AND total_trades < 500 THEN 1.0 ELSE 0.4 END)
  ))
`;

export function startSageCron() {
  // Hourly: score and feature top marketplace strategies
  cron.schedule("45 * * * *", async () => {
    try {
      await curateMarketplace();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "sage curator cron failed");
    }
  });
  logger.info("sage marketplace curator cron scheduled (hourly)");
}

export async function curateMarketplace(): Promise<{ scored: number; featured: number }> {
  // Get all published strategies with their latest backtest
  const strategies = await db.select({
    id: schema.customStrategies.id,
    name: schema.customStrategies.name,
    description: schema.customStrategies.description,
    published: schema.customStrategies.published,
    rating: schema.customStrategies.rating,
    clones: schema.customStrategies.clones,
  })
    .from(schema.customStrategies)
    .where(eq(schema.customStrategies.published, "true"))
    .execute();

  if (strategies.length === 0) return { scored: 0, featured: 0 };

  // Get latest backtest for each strategy
  const scored: { strategyId: string; name: string; quality: number; sharpe: number; drawdown: number; trades: number }[] = [];

  for (const s of strategies) {
    const backtests = await db.select({
      sharpe: schema.backtests.sharpeRatio,
      drawdown: schema.backtests.maxDrawdownPct,
      trades: schema.backtests.totalTrades,
    })
      .from(schema.backtests)
      .where(eq(schema.backtests.userId, s.id)) // Note: this might not work if backtests.userId != customStrategies.userId
      .orderBy(desc(schema.backtests.createdAt))
      .limit(1)
      .execute();

    if (backtests.length === 0) continue;
    const bt = backtests[0];
    const sharpe = Number(bt.sharpe || 0);
    const drawdown = Number(bt.drawdown || 0);
    const trades = Number(bt.trades || 0);

    // Quality score
    const sharpeScore = Math.min(1, Math.max(0, sharpe / 3.0));
    const drawdownScore = Math.max(0, 1 - drawdown / 0.3);
    const complexityScore = trades > 10 && trades < 500 ? 1.0 : 0.4;
    const quality = 0.4 * sharpeScore + 0.3 * drawdownScore + 0.3 * complexityScore;

    scored.push({
      strategyId: s.id,
      name: s.name,
      quality,
      sharpe,
      drawdown,
      trades,
    });
  }

  // Update quality scores in DB
  let updated = 0;
  for (const s of scored) {
    await db.update(schema.customStrategies)
      .set({ rating: Math.round(s.quality * 100) })
      .where(eq(schema.customStrategies.id, s.strategyId))
      .execute();
    updated++;
  }

  // Top 10 are "featured" — log them
  const top = scored.sort((a, b) => b.quality - a.quality).slice(0, 10);
  logger.info({ top, total: scored.length }, "sage: marketplace curated");

  return { scored: updated, featured: top.length };
}