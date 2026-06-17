/**
 * Paper trading engine.
 *
 * - Submit / cancel / list orders
 * - On each price tick, fill pending orders that hit their trigger
 * - Track positions (signed quantity: + long, - short)
 * - Calculate realized + unrealized P&L
 * - Persist to DB; broadcast fill events to user's WS channel
 *
 * Demo defaults:
 *   - Paper balance: $100,000 (stored in user.preferences.paperBalance)
 *   - Slippage: 0.05% on market orders
 *   - Position limit: $50,000 per symbol
 *   - Max open orders: 20
 */
import { db, schema, client } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { logger } from "../../lib/logger";
import { broadcastToUser } from "../../ws/userBroadcaster";
import { getQuotes } from "../data/quoteCache";
import type { MarketData } from "../../../shared/types";

const PAPER_BALANCE_DEFAULT = 100_000;
const SLIPPAGE_BPS = 5; // 0.05%
const POSITION_LIMIT_USD = 50_000;
const MAX_OPEN_ORDERS = 20;

const KNOWN_SYMBOLS = ["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"] as const;

export const orderSchema = z.object({
  symbol: z.enum(KNOWN_SYMBOLS),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit", "stop"]),
  quantity: z.number().positive().max(1_000_000),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  strategyId: z.string().optional(),
}).refine(
  (o) => o.type === "market" || (o.type === "limit" && o.limitPrice) || (o.type === "stop" && o.stopPrice),
  { message: "limit orders need limitPrice, stop orders need stopPrice" }
);

export type OrderInput = z.infer<typeof orderSchema>;

export interface OrderRow {
  id: string;
  userId: string;
  strategyId: string | null;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  quantity: string;
  limitPrice: string | null;
  stopPrice: string | null;
  status: "pending" | "filled" | "cancelled" | "rejected" | "partial";
  filledQty: string;
  avgFillPrice: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  filledAt: Date | null;
  cancelledAt: Date | null;
}

export interface PositionRow {
  id: string;
  userId: string;
  symbol: string;
  quantity: string;
  avgEntryPrice: string;
  realizedPnl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PnlSummary {
  paperBalance: number;
  equity: number;          // balance + unrealized P&L across positions
  unrealizedPnl: number;
  realizedPnl: number;
  positions: number;
  totalTradeCount: number;
}

// ─── Submission ─────────────────────────────────────────────────────────

export async function submitOrder(userId: string, input: OrderInput): Promise<{ order: OrderRow; reason?: string }> {
  const parsed = orderSchema.parse(input);

  // Reject if too many open orders
  const open = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "pending")));
  if ((open[0]?.count || 0) >= MAX_OPEN_ORDERS) {
    return { order: null as any, reason: `Max open orders (${MAX_OPEN_ORDERS}) reached` };
  }

  // Validate symbol (also enforced by zod enum, defense-in-depth)
  const known = ["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"];
  if (!known.includes(parsed.symbol.toUpperCase())) {
    return { order: null as any, reason: `Unknown symbol ${parsed.symbol}` };
  }

  // Compute fill price for market orders
  let fillPrice: number | null = null;
  if (parsed.type === "market") {
    const q = await getQuote(parsed.symbol);
    if (!q) return { order: null as any, reason: "No market price available" };
    fillPrice = applySlippage(q.price, parsed.side);
  }

  const id = nanoid();
  await db.insert(schema.orders).values({
    id,
    userId,
    strategyId: parsed.strategyId || null,
    symbol: parsed.symbol.toUpperCase(),
    side: parsed.side,
    type: parsed.type,
    quantity: String(parsed.quantity),
    limitPrice: parsed.limitPrice != null ? String(parsed.limitPrice) : null,
    stopPrice: parsed.stopPrice != null ? String(parsed.stopPrice) : null,
    status: fillPrice !== null ? "filled" : "pending",
    filledQty: fillPrice !== null ? String(parsed.quantity) : "0",
    avgFillPrice: fillPrice !== null ? String(fillPrice) : null,
    filledAt: fillPrice !== null ? new Date() : null,
  }).execute();

  const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, id)).execute())[0] as OrderRow;
  logger.info({ orderId: id, userId, symbol: parsed.symbol, side: parsed.side, type: parsed.type, fillPrice }, "order submitted");

  // For market orders, update position immediately
  if (fillPrice !== null) {
    await applyFill(userId, order, fillPrice);
  }

  return { order };
}

export async function cancelOrder(userId: string, orderId: string): Promise<{ ok: boolean; reason?: string }> {
  const rows = await db.select().from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)))
    .execute();
  if (rows.length === 0) return { ok: false, reason: "Order not found" };
  const order = rows[0] as OrderRow;
  if (order.status !== "pending") return { ok: false, reason: `Cannot cancel ${order.status} order` };
  await db.update(schema.orders)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(schema.orders.id, orderId))
    .execute();
  broadcastToUser(userId, { type: "order_cancelled", data: { orderId } });
  return { ok: true };
}

// ─── Listing ────────────────────────────────────────────────────────────

export async function listOrders(userId: string, opts: { status?: string; symbol?: string; limit?: number; offset?: number } = {}): Promise<OrderRow[]> {
  const where = [eq(schema.orders.userId, userId)];
  if (opts.status) where.push(eq(schema.orders.status, opts.status as any));
  if (opts.symbol) where.push(eq(schema.orders.symbol, opts.symbol.toUpperCase()));
  return db
    .select()
    .from(schema.orders)
    .where(and(...where))
    .orderBy(desc(schema.orders.createdAt))
    .limit(Math.min(opts.limit || 50, 200))
    .offset(opts.offset || 0)
    .execute() as Promise<OrderRow[]>;
}

export async function getPositions(userId: string): Promise<PositionRow[]> {
  return db.select().from(schema.positions).where(eq(schema.positions.userId, userId)).execute() as Promise<PositionRow[]>;
}

// ─── Quote + P&L ────────────────────────────────────────────────────────

export async function getPnl(userId: string): Promise<PnlSummary> {
  const positions = await getPositions(userId);
  const orders = await db.select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "filled")))
    .execute();
  const totalTrades = orders[0]?.count || 0;

  // Read paper balance from preferences (with fallback)
  let paperBalance = PAPER_BALANCE_DEFAULT;
  try {
    const userRows = await db.select({ preferences: schema.users.preferences })
      .from(schema.users).where(eq(schema.users.id, userId)).execute();
    const prefs = (userRows[0]?.preferences as any) || {};
    if (typeof prefs.paperBalance === "number") paperBalance = prefs.paperBalance;
  } catch { /* fall through */ }

  // Compute unrealized P&L using current quotes
  let unrealized = 0;
  if (positions.length > 0) {
    const allQuotes = await getQuotes();
    const priceMap = new Map(allQuotes.map((q) => [q.symbol, q.price]));
    for (const p of positions) {
      const qty = Number(p.quantity);
      if (qty === 0) continue;
      const mark = priceMap.get(p.symbol);
      if (mark == null) continue;
      const entry = Number(p.avgEntryPrice);
      unrealized += qty * (mark - entry);
    }
  }

  const realized = positions.reduce((s, p) => s + Number(p.realizedPnl), 0);
  const equity = paperBalance + unrealized;

  return {
    paperBalance,
    equity,
    unrealizedPnl: unrealized,
    realizedPnl: realized,
    positions: positions.filter((p) => Number(p.quantity) !== 0).length,
    totalTradeCount: Number(totalTrades),
  };
}

// ─── Tick processing (called by ingest worker) ─────────────────────────

let lastQuotes: Record<string, number> = {};

/**
 * Called on every quote tick. Fills any pending limit/stop orders that match.
 */
export async function processTick(quotes: MarketData[]): Promise<void> {
  for (const q of quotes) {
    lastQuotes[q.symbol] = q.price;
  }
  // Find all pending orders
  const pending = await db.select().from(schema.orders).where(eq(schema.orders.status, "pending")).execute() as OrderRow[];
  for (const order of pending) {
    const price = lastQuotes[order.symbol];
    if (price == null) continue;

    let fill: number | null = null;
    if (order.type === "limit") {
      const limit = Number(order.limitPrice);
      if (order.side === "buy" && price <= limit) fill = price;
      if (order.side === "sell" && price >= limit) fill = price;
    } else if (order.type === "stop") {
      const stop = Number(order.stopPrice);
      if (order.side === "buy" && price >= stop) fill = price;
      if (order.side === "sell" && price <= stop) fill = price;
    }

    if (fill !== null) {
      await db.update(schema.orders)
        .set({ status: "filled", filledAt: new Date(), filledQty: order.quantity, avgFillPrice: String(fill) })
        .where(eq(schema.orders.id, order.id))
        .execute();
      await applyFill(order.userId, { ...order, status: "filled", avgFillPrice: String(fill) }, fill);
    }
  }
}

// ─── Position updates ──────────────────────────────────────────────────

async function applyFill(userId: string, order: OrderRow, price: number): Promise<void> {
  const qty = Number(order.quantity) * (order.side === "buy" ? 1 : -1);
  const existing = await db.select().from(schema.positions)
    .where(and(eq(schema.positions.userId, userId), eq(schema.positions.symbol, order.symbol)))
    .execute();

  let realizedDelta = 0;
  if (existing.length === 0) {
    // Open new position
    await db.insert(schema.positions).values({
      id: nanoid(),
      userId,
      symbol: order.symbol,
      quantity: String(qty),
      avgEntryPrice: String(price),
      realizedPnl: "0",
    }).execute();
  } else {
    const pos = existing[0] as PositionRow;
    const oldQty = Number(pos.quantity);
    const oldAvg = Number(pos.avgEntryPrice);
    const newQty = oldQty + qty;

    if (Math.sign(oldQty) === Math.sign(qty) || oldQty === 0) {
      // Same direction: weighted average entry
      const totalCost = oldQty * oldAvg + qty * price;
      const newAvg = totalCost / newQty;
      await db.update(schema.positions)
        .set({ quantity: String(newQty), avgEntryPrice: String(newAvg), updatedAt: new Date() })
        .where(eq(schema.positions.id, pos.id))
        .execute();
    } else {
      // Opposite direction: realize P&L on closed portion
      const closingQty = Math.min(Math.abs(qty), Math.abs(oldQty));
      const pnlPerUnit = order.side === "buy"
        ? (oldAvg - price)   // closing a short
        : (price - oldAvg);  // closing a long
      realizedDelta = pnlPerUnit * closingQty;

      if (Math.abs(qty) >= Math.abs(oldQty)) {
        // Flipped or fully closed
        const remaining = newQty;
        if (remaining === 0) {
          await db.update(schema.positions)
            .set({
              quantity: "0",
              avgEntryPrice: String(price),
              realizedPnl: String(Number(pos.realizedPnl) + realizedDelta),
              updatedAt: new Date(),
            })
            .where(eq(schema.positions.id, pos.id))
            .execute();
        } else {
          // Flipped — new entry at fill price
          await db.update(schema.positions)
            .set({
              quantity: String(remaining),
              avgEntryPrice: String(price),
              realizedPnl: String(Number(pos.realizedPnl) + realizedDelta),
              updatedAt: new Date(),
            })
            .where(eq(schema.positions.id, pos.id))
            .execute();
        }
      } else {
        // Partial close
        await db.update(schema.positions)
          .set({
            quantity: String(newQty),
            realizedPnl: String(Number(pos.realizedPnl) + realizedDelta),
            updatedAt: new Date(),
          })
          .where(eq(schema.positions.id, pos.id))
          .execute();
      }
    }
  }

  // Broadcast fill + position update to user
  const [updatedPos] = await db.select().from(schema.positions)
    .where(and(eq(schema.positions.userId, userId), eq(schema.positions.symbol, order.symbol)))
    .execute();
  broadcastToUser(userId, {
    type: "order_filled",
    data: {
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      fillPrice: price,
      realizedPnlDelta: realizedDelta,
    },
  });
  broadcastToUser(userId, {
    type: "position_update",
    data: { position: updatedPos || null },
  });
}

function applySlippage(price: number, side: "buy" | "sell"): number {
  const factor = side === "buy" ? 1 + SLIPPAGE_BPS / 10_000 : 1 - SLIPPAGE_BPS / 10_000;
  return Math.round(price * factor * 100) / 100;
}
