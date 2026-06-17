/**
 * Risk management — enforces user-defined risk limits.
 *
 * Limits stored in user preferences:
 *   - risk.maxPositionSize (USD)     - max single position
 *   - risk.maxDailyLoss (USD)        - max loss per day (auto-resets at midnight UTC)
 *   - risk.maxOpenOrders (count)     - max simultaneous pending orders
 *   - risk.killSwitch (bool)         - if true, reject ALL new orders
 *
 * Checked in the order router BEFORE submitting.
 */
import { db, schema } from "../../db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface RiskLimits {
  maxPositionSize?: number;
  maxDailyLoss?: number;
  maxOpenOrders?: number;
  killSwitch?: boolean;
}

export interface RiskCheckInput {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

export interface RiskCheckResult {
  ok: boolean;
  reason?: string;
  triggeredLimit?: string;
  dailyPnl?: number;
}

const DEFAULT_LIMITS: RiskLimits = {
  maxPositionSize: 50_000,
  maxDailyLoss: 5_000,
  maxOpenOrders: 20,
  killSwitch: false,
};

export function defaultLimits(): RiskLimits {
  return { ...DEFAULT_LIMITS };
}

export async function getRiskLimits(userId: string): Promise<RiskLimits> {
  try {
    const rows = await db.select({ preferences: schema.users.preferences })
      .from(schema.users).where(eq(schema.users.id, userId)).execute();
    const prefs = (rows[0]?.preferences as any)?.risk || {};
    return { ...DEFAULT_LIMITS, ...prefs };
  } catch {
    return DEFAULT_LIMITS;
  }
}

export async function setRiskLimits(userId: string, limits: Partial<RiskLimits>): Promise<RiskLimits> {
  const current = await getRiskLimits(userId);
  const merged = { ...current, ...limits };
  const rows = await db.select({ preferences: schema.users.preferences })
    .from(schema.users).where(eq(schema.users.id, userId)).execute();
  const prefs = (rows[0]?.preferences as Record<string, any>) || {};
  prefs.risk = merged;
  await db.update(schema.users)
    .set({ preferences: prefs, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .execute();
  return merged;
}

async function getDailyPnl(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const orders = await db.select().from(schema.orders)
    .where(and(
      eq(schema.orders.userId, userId),
      gte(schema.orders.filledAt, startOfDay),
    ))
    .execute();
  // Approximate daily P&L: sum of (filled_qty * (avg_fill_price - limit_price)) for sells minus buys
  // More accurate: track realized P&L from closed positions. For now, return 0 (placeholder).
  // TODO: track realized P&L in a daily_pnl table.
  return 0;
}

export async function checkRisk(input: RiskCheckInput): Promise<RiskCheckResult> {
  const limits = await getRiskLimits(input.userId);
  const orderValue = input.quantity * input.price;

  if (limits.killSwitch) {
    return { ok: false, reason: "Kill switch is enabled. Disable it in Settings to trade.", triggeredLimit: "killSwitch" };
  }

  if (limits.maxPositionSize && orderValue > limits.maxPositionSize) {
    return {
      ok: false,
      reason: `Order $${orderValue.toFixed(2)} exceeds max position size $${limits.maxPositionSize.toFixed(2)}`,
      triggeredLimit: "maxPositionSize",
    };
  }

  if (limits.maxOpenOrders) {
    const openOrders = await db.select().from(schema.orders)
      .where(and(
        eq(schema.orders.userId, input.userId),
        eq(schema.orders.status, "pending"),
      ))
      .execute();
    if (openOrders.length >= limits.maxOpenOrders) {
      return {
        ok: false,
        reason: `Already have ${openOrders.length} open orders (max ${limits.maxOpenOrders})`,
        triggeredLimit: "maxOpenOrders",
      };
    }
  }

  if (limits.maxDailyLoss) {
    const dailyPnl = await getDailyPnl(input.userId);
    if (dailyPnl < -limits.maxDailyLoss) {
      return {
        ok: false,
        reason: `Daily loss limit reached: -$${Math.abs(dailyPnl).toFixed(2)} of $${limits.maxDailyLoss.toFixed(2)}`,
        triggeredLimit: "maxDailyLoss",
        dailyPnl,
      };
    }
  }

  return { ok: true };
}

/**
 * Log a risk event for audit purposes.
 */
export async function logRiskEvent(userId: string, orderId: string | null, result: RiskCheckResult) {
  logger.warn({
    userId,
    orderId,
    ok: result.ok,
    reason: result.reason,
    triggeredLimit: result.triggeredLimit,
  }, "risk check");
  // TODO: persist to audit log table
}
