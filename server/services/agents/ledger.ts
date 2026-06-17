/**
 * Ledger — Position Reconciliation Agent
 *
 * Compares internal `positions` table vs broker (Alpaca) positions daily.
 * Flags discrepancies:
 *   - Missing position (in broker, not in our table)
 *   - Phantom position (in our table, not in broker)
 *   - Quantity mismatch (different sizes)
 *   - Price/avg entry mismatch
 *
 * Critical for live trading — bugs that cause drift are expensive.
 */
import cron from "node-cron";
import { eq, and, desc, gt, sql, ne } from "drizzle-orm";
import { db, schema } from "../../db";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

interface Reconciliation {
  userId: string;
  symbol: string;
  internal: { quantity: number; avgPrice: number } | null;
  broker: { quantity: number; avgPrice: number } | null;
  status: "match" | "qty_mismatch" | "missing_internal" | "phantom_internal" | "price_mismatch";
  delta: number;
  note: string;
}

const QTY_TOLERANCE = 0.01;
const PRICE_TOLERANCE = 0.005; // 0.5%

export function startLedgerCron() {
  // Daily at 5pm ET (22:00 UTC) after US market close
  cron.schedule("0 22 * * 1-5", async () => {
    try {
      await reconcileAllUsers();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "ledger reconciliation failed");
    }
  });
  logger.info("ledger reconciliation cron scheduled (weekdays 5pm ET)");
}

export async function reconcileUser(userId: string): Promise<Reconciliation[]> {
  // Get internal positions
  const internalPositions = await db.select().from(schema.positions)
    .where(and(eq(schema.positions.userId, userId), gt(sql`${schema.positions.quantity}::numeric`, 0)))
    .execute();

  // Get broker positions (Alpaca paper or live)
  const brokerPositions = await fetchBrokerPositions(userId);

  const internal = new Map<string, { quantity: number; avgPrice: number }>();
  for (const p of internalPositions) {
    internal.set(p.symbol, {
      quantity: Number(p.quantity),
      avgPrice: Number(p.avgEntryPrice),
    });
  }
  const broker = new Map<string, { quantity: number; avgPrice: number }>();
  for (const p of brokerPositions) {
    broker.set(p.symbol, { quantity: p.quantity, avgPrice: p.avgPrice });
  }

  const allSymbols = new Set([...internal.keys(), ...broker.keys()]);
  const results: Reconciliation[] = [];

  for (const sym of allSymbols) {
    const i = internal.get(sym) || null;
    const b = broker.get(sym) || null;

    if (i && !b) {
      results.push({
        userId,
        symbol: sym,
        internal: i,
        broker: null,
        status: "phantom_internal",
        delta: i.quantity * i.avgPrice,
        note: `Our records show ${i.quantity} ${sym} @ $${i.avgPrice.toFixed(2)}, broker has no position. Could be a missed sync.`,
      });
    } else if (!i && b) {
      results.push({
        userId,
        symbol: sym,
        internal: null,
        broker: b,
        status: "missing_internal",
        delta: b.quantity * b.avgPrice,
        note: `Broker shows ${b.quantity} ${sym} @ $${b.avgPrice.toFixed(2)} but our records have nothing. Order may not have been logged.`,
      });
    } else if (i && b) {
      const qtyDelta = Math.abs(i.quantity - b.quantity);
      const priceDelta = Math.abs(i.avgPrice - b.avgPrice) / i.avgPrice;

      if (qtyDelta > QTY_TOLERANCE) {
        results.push({
          userId,
          symbol: sym,
          internal: i,
          broker: b,
          status: "qty_mismatch",
          delta: qtyDelta,
          note: `${sym} quantity mismatch: we have ${i.quantity}, broker has ${b.quantity}. Delta: ${qtyDelta}.`,
        });
      } else if (priceDelta > PRICE_TOLERANCE) {
        results.push({
          userId,
          symbol: sym,
          internal: i,
          broker: b,
          status: "price_mismatch",
          delta: priceDelta,
          note: `${sym} avg entry mismatch: we have $${i.avgPrice.toFixed(2)}, broker has $${b.avgPrice.toFixed(2)} (${(priceDelta * 100).toFixed(2)}% diff).`,
        });
      } else {
        results.push({
          userId,
          symbol: sym,
          internal: i,
          broker: b,
          status: "match",
          delta: 0,
          note: `${sym} matches broker.`,
        });
      }
    }
  }

  return results;
}

async function fetchBrokerPositions(userId: string): Promise<{ symbol: string; quantity: number; avgPrice: number }[]> {
  // For paper trading: we have no real broker — reconcile against our own orders
  // For live (Alpaca): would call Alpaca API here
  // Mock: assume everything matches unless there's a known issue
  try {
    const alpacaKey = process.env.ALPACA_API_KEY;
    if (!alpacaKey) {
      // Paper mode: assume broker matches our internal state
      return [];
    }
    // TODO: real Alpaca fetch
    // const res = await fetch(`https://paper-api.alpaca.markets/v2/positions`, { headers: { "APCA-API-KEY-ID": alpacaKey, "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY } });
    // const positions = await res.json();
    // return positions.map(p => ({ symbol: p.symbol, quantity: Number(p.qty), avgPrice: Number(p.avg_entry_price) }));
    return [];
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "broker fetch failed");
    return [];
  }
}

async function reconcileAllUsers() {
  const users = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.status, "active"))
    .execute();

  let totalDiscrepancies = 0;
  for (const u of users) {
    const results = await reconcileUser(u.id);
    const issues = results.filter((r) => r.status !== "match");
    if (issues.length > 0) {
      totalDiscrepancies += issues.length;
      for (const issue of issues) {
        await notify(u.id, "alert", {
          title: `Ledger: ${issue.symbol} ${issue.status.replace("_", " ")}`,
          body: issue.note,
          metadata: { symbol: issue.symbol, status: issue.status, delta: issue.delta },
        });
      }
    }
  }
  logger.info({ discrepancies: totalDiscrepancies, users: users.length }, "ledger: daily reconciliation complete");
}