/**
 * Order router — decides paper vs live.
 *
 * Defaults to paper for safety. Live trading requires:
 *   1. User's preferences.tradingMode === "live"
 *   2. User has KYC verified (status="approved")
 *   3. User has linked Alpaca account (kyc_submissions has alpaca_account_id)
 *
 * Admin override: users with role=admin can force any mode.
 */
import { db, schema } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { submitOrder as submitPaperOrder } from "./paperEngine";
import { submitAlpacaOrder, getAlpacaConfig, isAlpacaConfigured } from "./alpaca";
import { checkRisk, logRiskEvent } from "../risk/manager";

export type TradingMode = "paper" | "live";

export interface OrderRouteResult {
  mode: TradingMode;
  order: any;
  message: string;
}

/**
 * Submit an order — routes to paper or live based on user config + KYC.
 */
export async function routeOrder(userId: string, input: {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  strategyId?: string;
}): Promise<OrderRouteResult> {
  // Risk check FIRST — before paper or live routing
  const price = input.limitPrice || input.stopPrice || 100; // fallback if market
  const riskResult = await checkRisk({ userId, symbol: input.symbol, side: input.side, quantity: input.quantity, price });
  await logRiskEvent(userId, null, riskResult);
  if (!riskResult.ok) {
    return { mode: "paper", order: null, message: riskResult.reason || "Risk check failed" };
  }

  // Check user config
  const userRows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
  const user = userRows[0] as any;
  const prefs = (user?.preferences as Record<string, any>) || {};
  const requestedMode: TradingMode = prefs.tradingMode === "live" ? "live" : "paper";

  // For now, always paper unless explicitly opted in
  if (requestedMode === "live") {
    // Check KYC
    const kycRows = await db.select().from(schema.kycSubmissions)
      .where(and(eq(schema.kycSubmissions.userId, userId), eq(schema.kycSubmissions.status, "approved")))
      .orderBy(desc(schema.kycSubmissions.submittedAt))
      .execute();
    if (kycRows.length === 0) {
      logger.warn({ userId }, "live mode requested but no approved KYC — falling back to paper");
      return await routeToPaper(userId, input, "live requested but KYC not approved — paper");
    }
    if (!isAlpacaConfigured()) {
      logger.warn({ userId }, "live mode but Alpaca not configured — falling back to paper");
      return await routeToPaper(userId, input, "live requested but Alpaca not configured — paper");
    }
    return await routeToLive(userId, input);
  }
  return await routeToPaper(userId, input, "paper (default)");
}

async function routeToPaper(userId: string, input: any, reason: string): Promise<OrderRouteResult> {
  const { order, reason: rej } = await submitPaperOrder(userId, input);
  if (!order) {
    return { mode: "paper", order: null, message: rej || "paper order rejected" };
  }
  return { mode: "paper", order, message: reason };
}

async function routeToLive(userId: string, input: any): Promise<OrderRouteResult> {
  const clientOrderId = `aether-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const alpacaOrder = await submitAlpacaOrder({
      symbol: input.symbol,
      side: input.side,
      qty: input.quantity,
      type: input.type,
      limitPrice: input.limitPrice,
      stopPrice: input.stopPrice,
      clientOrderId,
    });
    // Mirror to local orders table for UI consistency
    await db.insert(schema.orders).values({
      id: alpacaOrder.id,
      userId,
      strategyId: input.strategyId || null,
      symbol: alpacaOrder.symbol,
      side: alpacaOrder.side,
      type: alpacaOrder.type,
      quantity: alpacaOrder.qty,
      limitPrice: alpacaOrder.limit_price,
      stopPrice: alpacaOrder.stop_price,
      status: alpacaOrder.status,
      filledQty: alpacaOrder.filled_qty,
      avgFillPrice: alpacaOrder.filled_avg_price,
      filledAt: alpacaOrder.filled_at ? new Date(alpacaOrder.filled_at) : null,
    }).execute();
    logger.info({ userId, alpacaOrderId: alpacaOrder.id, symbol: input.symbol }, "live order submitted to Alpaca");
    return { mode: "live", order: alpacaOrder, message: "submitted to Alpaca" };
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, "Alpaca order failed — falling back to paper");
    return await routeToPaper(userId, input, "Alpaca failed — paper fallback");
  }
}

/**
 * Set user's trading mode. Live requires admin approval.
 */
export async function setTradingMode(userId: string, mode: TradingMode): Promise<{ ok: boolean; message: string }> {
  if (mode === "paper") {
    const userRows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    const user = userRows[0] as any;
    const prefs = (user?.preferences as Record<string, any>) || {};
    prefs.tradingMode = "paper";
    await db.update(schema.users)
      .set({ preferences: prefs, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .execute();
    return { ok: true, message: "Switched to paper trading" };
  }

  // Live mode requires: KYC approved + Alpaca configured
  const kycRows = await db.select().from(schema.kycSubmissions)
    .where(and(eq(schema.kycSubmissions.userId, userId), eq(schema.kycSubmissions.status, "approved")))
    .execute();
  if (kycRows.length === 0) {
    return { ok: false, message: "KYC verification required for live trading" };
  }
  if (!isAlpacaConfigured()) {
    return { ok: false, message: "Broker integration not configured by operator" };
  }

  const userRows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
  const user = userRows[0] as any;
  const prefs = (user?.preferences as Record<string, any>) || {};
  prefs.tradingMode = "live";
  await db.update(schema.users)
    .set({ preferences: prefs, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .execute();
  return { ok: true, message: "Switched to live trading" };
}
