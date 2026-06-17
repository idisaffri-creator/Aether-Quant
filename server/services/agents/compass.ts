/**
 * Compass — Portfolio Rebalancer
 *
 * Monitors user's portfolio exposure. When any symbol exceeds target
 * concentration OR the portfolio drifts significantly from target allocation,
 * suggests rebalancing trades.
 *
 * Modes:
 *   - Conservative: alert only, no auto-trade
 *   - Balanced: alert + suggest specific rebalance trades
 *   - Aggressive: alert + auto-submit rebalance orders (paper only)
 *
 * Runs daily at 4pm ET (after US market close).
 */
import cron from "node-cron";
import { eq, and, gt, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

interface RebalanceAction {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  reason: string;
}

interface RebalanceSuggestion {
  userId: string;
  actions: RebalanceAction[];
  currentExposure: Record<string, number>;
  targetExposure: Record<string, number>;
  drift: number;
}

const REBALANCE_THRESHOLD = 0.05; // 5% drift triggers alert

export function startCompassCron() {
  // Daily at 4pm ET (21:00 UTC) — after US market close
  cron.schedule("0 21 * * 1-5", async () => {
    try {
      await rebalanceAllUsers();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "compass rebalance failed");
    }
  });
  logger.info("compass portfolio rebalancer cron scheduled (weekdays 4pm ET)");
}

export async function rebalanceUser(userId: string): Promise<RebalanceSuggestion | null> {
  // Get user's open positions
  const positions = await db.select().from(schema.positions)
    .where(and(eq(schema.positions.userId, userId), gt(sql`${schema.positions.quantity}::numeric`, 0)))
    .execute();
  if (positions.length === 0) return null;

  // Calculate total exposure per symbol
  const exposure: Record<string, number> = {};
  let totalExposure = 0;
  for (const p of positions) {
    const mv = Number(p.quantity) * Number(p.avgEntryPrice);
    exposure[p.symbol] = (exposure[p.symbol] || 0) + mv;
    totalExposure += mv;
  }
  const currentExposurePct: Record<string, number> = {};
  for (const sym in exposure) {
    currentExposurePct[sym] = exposure[sym] / totalExposure;
  }

  // Target exposure: equal weight across symbols (simple, can be customized later)
  const targetExposurePct: Record<string, number> = {};
  const symbols = Object.keys(currentExposurePct);
  const equalWeight = 1 / symbols.length;
  for (const sym of symbols) {
    targetExposurePct[sym] = equalWeight;
  }

  // Calculate drift
  const drift = Object.keys(currentExposurePct).reduce((sum, sym) => {
    return sum + Math.abs((currentExposurePct[sym] || 0) - (targetExposurePct[sym] || 0));
  }, 0) / 2; // total drift

  if (drift < REBALANCE_THRESHOLD) return null;

  // Generate rebalance actions
  const actions: RebalanceAction[] = [];
  for (const sym of symbols) {
    const current = currentExposurePct[sym];
    const target = targetExposurePct[sym];
    const delta = target - current;
    if (Math.abs(delta) < 0.02) continue; // skip small rebalances
    const position = positions.find((p) => p.symbol === sym);
    if (!position) continue;
    const targetMV = totalExposure * target;
    const currentMV = exposure[sym];
    const deltaMV = targetMV - currentMV;
    const qtyToTrade = deltaMV / Number(position.avgEntryPrice);
    if (Math.abs(qtyToTrade) < 0.01) continue;
    actions.push({
      symbol: sym,
      side: deltaMV > 0 ? "buy" : "sell",
      quantity: Math.abs(qtyToTrade),
      reason: `Rebalance: ${sym} at ${(current * 100).toFixed(1)}% (target ${(target * 100).toFixed(1)}%)`,
    });
  }

  return {
    userId,
    actions,
    currentExposure: currentExposurePct,
    targetExposure: targetExposurePct,
    drift,
  };
}

async function rebalanceAllUsers() {
  const users = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.status, "active"))
    .execute();
  let suggestions = 0;
  for (const u of users) {
    const suggestion = await rebalanceUser(u.id);
    if (suggestion && suggestion.actions.length > 0) {
      const actionSummary = suggestion.actions
        .map((a) => `${a.side.toUpperCase()} ${a.quantity.toFixed(2)} ${a.symbol}`)
        .join(" | ");
      await notify(u.id, "alert", {
        title: `Compass: Rebalance needed (${(suggestion.drift * 100).toFixed(1)}% drift)`,
        body: `${suggestion.actions.length} trades suggested: ${actionSummary}`,
        metadata: {
          drift: suggestion.drift,
          actions: suggestion.actions,
          currentExposure: suggestion.currentExposure,
          targetExposure: suggestion.targetExposure,
        },
      });
      suggestions++;
    }
  }
  logger.info({ suggestions, users: users.length }, "compass: daily rebalance complete");
}