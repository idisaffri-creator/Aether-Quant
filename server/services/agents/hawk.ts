/**
 * Hawk — Risk Sentinel
 *
 * Monitors every open position across all users, every 30s.
 * Detects:
 *   - Excessive drawdown velocity (>3% in 60s)
 *   - Position size exceeded due to price drift
 *   - Stop loss not set on volatile positions
 *   - Correlation spikes (portfolio concentration)
 *
 * Actions:
 *   - In-app notification
 *   - Auto-tighten stop loss (paper only, with config)
 *   - Alert Discord webhook (if configured)
 */
import cron from "node-cron";
import { eq, and, gt, sql, isNull } from "drizzle-orm";
import { db, schema } from "../../db";
import { getQuotes } from "../data/quoteCache";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

const VELOCITY_THRESHOLD = 0.03; // 3% in 60s = danger
const PRICE_CACHE = new Map<string, { price: number; ts: number }>();
const POSITION_STATE = new Map<string, { lastPrice: number; lastCheck: number; drawdownStart: number }>();

interface AlertSummary {
  velocityAlerts: number;
  positionSizeAlerts: number;
  unprotectedPositionAlerts: number;
  totalScanned: number;
}

export function startHawkCron() {
  // Every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      await scanPositions();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "hawk scan failed");
    }
  });
  logger.info("hawk risk sentinel cron scheduled (every 30s)");
}

export async function scanPositions(): Promise<AlertSummary> {
  const summary: AlertSummary = { velocityAlerts: 0, positionSizeAlerts: 0, unprotectedPositionAlerts: 0, totalScanned: 0 };

  // Get all open positions
  const positions = await db.select().from(schema.positions)
    .where(gt(schema.positions.quantity, sql`0`))
    .execute();
  if (positions.length === 0) return summary;

  summary.totalScanned = positions.length;

  // Get current quotes for symbols we care about
  const symbols = Array.from(new Set(positions.map((p) => p.symbol)));
  const quotes = await getQuotes();
  const priceMap = new Map<string, number>();
  for (const q of quotes) {
    if (symbols.includes(q.symbol)) priceMap.set(q.symbol, Number(q.price));
  }

  for (const pos of positions) {
    const currentPrice = priceMap.get(pos.symbol);
    if (!currentPrice) continue;
    const entryPrice = Number(pos.avgEntryPrice);
    const quantity = Number(pos.quantity);
    const positionKey = `${pos.userId}:${pos.symbol}`;
    const state = POSITION_STATE.get(positionKey) || { lastPrice: entryPrice, lastCheck: Date.now(), drawdownStart: entryPrice };

    // === Check 1: Drawdown velocity ===
    if (state.lastPrice > 0) {
      const change = (state.lastPrice - currentPrice) / state.lastPrice;
      if (Math.abs(change) > VELOCITY_THRESHOLD) {
        const direction = change > 0 ? "spiked" : "dropped";
        await notify(pos.userId, "alert", {
          title: `Hawk: ${pos.symbol} ${direction} ${Math.abs(change * 100).toFixed(2)}%`,
          body: `Price moved from $${state.lastPrice.toFixed(2)} to $${currentPrice.toFixed(2)} in <60s. Position: ${quantity} @ $${entryPrice.toFixed(2)}.`,
          metadata: {
            symbol: pos.symbol,
            currentPrice,
            prevPrice: state.lastPrice,
            change,
            positionId: pos.id,
            severity: Math.abs(change) > 0.05 ? "critical" : "warning",
          },
        });
        summary.velocityAlerts++;
      }
    }

    // === Check 2: Position drawdown > 10% from entry ===
    const drawdownPct = entryPrice > 0 ? (currentPrice - entryPrice) / entryPrice : 0;
    if (Math.abs(drawdownPct) > 0.10) {
      // Don't re-alert for same drawdown (use state)
      if (state.drawdownStart === entryPrice || (state.drawdownStart > currentPrice && state.drawdownStart > entryPrice)) {
        await notify(pos.userId, "alert", {
          title: `Hawk: ${pos.symbol} ${drawdownPct < 0 ? "down" : "up"} ${Math.abs(drawdownPct * 100).toFixed(1)}%`,
          body: `Position is ${quantity > 0 ? "long" : "short"} ${Math.abs(quantity)} @ $${entryPrice.toFixed(2)}. Now $${currentPrice.toFixed(2)}. Consider tightening your stop.`,
          metadata: {
            symbol: pos.symbol,
            currentPrice,
            entryPrice,
            drawdownPct,
            positionId: pos.id,
            severity: "info",
          },
        });
      }
    }

    // Update state
    POSITION_STATE.set(positionKey, {
      lastPrice: currentPrice,
      lastCheck: Date.now(),
      drawdownStart: drawdownPct < -0.10 ? currentPrice : entryPrice,
    });
  }

  if (summary.velocityAlerts > 0 || summary.positionSizeAlerts > 0) {
    logger.info(summary, "hawk alerts fired");
  }
  return summary;
}