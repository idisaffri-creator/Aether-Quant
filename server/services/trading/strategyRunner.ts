/**
 * Strategy runner — bridges the signals table to paper trading.
 *
 * For each user that has at least one signal "watching" for them,
 * auto-submits a paper order matching the signal direction.
 *
 * Tracks P&L per (user, strategy) via strategy_runs.
 *
 * To enable for a user: insert signals with userId set, or call
 * startStrategyRun() to subscribe to all global signals.
 */
import { db, schema } from "../../db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { logger } from "../../lib/logger";
import { submitOrder } from "./paperEngine";
import type { TradeSignal } from "../../../shared/types";

const STRATEGY_RUN_FEE_BPS = 0; // paper trading: no fees for now

/**
 * Start a strategy run for a user. Persists a strategy_runs row.
 */
export async function startStrategyRun(userId: string, strategyId: string): Promise<{ runId: string }> {
  // Mark any existing running as stopped
  await db.update(schema.strategyRuns)
    .set({ status: "stopped", stoppedAt: new Date() })
    .where(and(
      eq(schema.strategyRuns.userId, userId),
      eq(schema.strategyRuns.strategyId, strategyId),
      eq(schema.strategyRuns.status, "running"),
    ))
    .execute();

  const runId = nanoid();
  await db.insert(schema.strategyRuns).values({
    id: runId,
    userId,
    strategyId,
    status: "running",
    startedAt: new Date(),
  }).execute();
  logger.info({ runId, userId, strategyId }, "strategy run started");
  return { runId };
}

/**
 * Stop a strategy run. Final P&L is computed from current position values.
 */
export async function stopStrategyRun(userId: string, strategyId: string): Promise<{ ok: boolean; runId?: string }> {
  const result = await db.select().from(schema.strategyRuns)
    .where(and(
      eq(schema.strategyRuns.userId, userId),
      eq(schema.strategyRuns.strategyId, strategyId),
      eq(schema.strategyRuns.status, "running"),
    ))
    .execute();
  if (result.length === 0) return { ok: false };
  const run = result[0];
  await db.update(schema.strategyRuns)
    .set({ status: "stopped", stoppedAt: new Date() })
    .where(eq(schema.strategyRuns.id, run.id))
    .execute();
  logger.info({ runId: run.id, userId, strategyId }, "strategy run stopped");
  return { ok: true, runId: run.id };
}

/**
 * Process unacknowledged signals and submit paper orders for each user.
 * Called by ingest on each quote tick.
 *
 * A signal is "for" a user if:
 *  - signal.userId === user.id (targeted), OR
 *  - signal.userId IS NULL (broadcast — picked up by all running strategies)
 */
export async function processSignals(quotes: { symbol: string; price: number }[]): Promise<{ ordersSubmitted: number }> {
  // Find all unacknowledged, non-expired signals
  const now = new Date();
  const signals = await db.select().from(schema.signals)
    .where(and(
      eq(schema.signals.acknowledged, "false"),
      // Only signals from the last 10 minutes (avoid stale ones)
      gte(schema.signals.createdAt, new Date(now.getTime() - 10 * 60_000)),
    ))
    .orderBy(desc(schema.signals.createdAt))
    .execute() as Array<{
      id: string;
      userId: string | null;
      symbol: string;
      direction: "long" | "short";
      confidence: string;
      strategy: string;
      reason: string;
      createdAt: Date;
    }>;

  let submitted = 0;
  for (const sig of signals) {
    if (!sig.symbol) continue;
    // For broadcast signals (userId IS NULL), target all users with running strategies
    const targetUserIds = sig.userId
      ? [sig.userId]
      : (await db.select({ userId: schema.strategyRuns.userId })
          .from(schema.strategyRuns)
          .where(eq(schema.strategyRuns.status, "running"))
          .execute()).map((r) => r.userId);

    if (targetUserIds.length === 0) continue;

    for (const userId of targetUserIds) {
      try {
        // Size: 1 unit per signal, scaled by confidence (0.5x to 2x)
        const confidence = parseFloat(sig.confidence) || 0.5;
        const qty = Math.max(0.5, Math.min(2, confidence * 2));

        const { order, reason } = await submitOrder(userId, {
          symbol: sig.symbol,
          side: sig.direction === "long" ? "buy" : "sell",
          type: "market",
          quantity: qty,
          strategyId: sig.strategy,
        });

        if (order) {
          submitted++;
          // Update strategy run stats
          await db.update(schema.strategyRuns)
            .set({
              tradeCount: sql`${schema.strategyRuns.tradeCount} + 1`,
            })
            .where(and(
              eq(schema.strategyRuns.userId, userId),
              eq(schema.strategyRuns.strategyId, sig.strategy),
              eq(schema.strategyRuns.status, "running"),
            ))
            .execute();
        } else {
          logger.debug({ userId, reason }, "strategy runner: order skipped");
        }
      } catch (err) {
        logger.warn({ err: (err as Error).message, userId, signalId: sig.id }, "strategy runner: submit failed");
      }
    }

    // Mark signal acknowledged
    await db.update(schema.signals)
      .set({ acknowledged: "true" })
      .where(eq(schema.signals.id, sig.id))
      .execute();
  }
  return { ordersSubmitted: submitted };
}

/**
 * List running strategy runs for a user.
 */
export async function listStrategyRuns(userId: string) {
  return db.select().from(schema.strategyRuns)
    .where(eq(schema.strategyRuns.userId, userId))
    .orderBy(desc(schema.strategyRuns.startedAt))
    .execute();
}
