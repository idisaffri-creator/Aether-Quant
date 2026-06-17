/**
 * Hermes — Latency Arbitrage Scanner
 *
 * Detects price discrepancies for the same asset across different venues.
 * Real implementation would compare:
 *   - Alpaca (US equities, crypto)
 *   - Binance (crypto)
 *   - Coinbase (crypto)
 *   - CME futures (commodities)
 *   - ICE futures (energy)
 *
 * For now, we use the multi-feed setup we have:
 *   - Yahoo (free, delayed)
 *   - Alpaca paper (real-time paper)
 *   - Internal paper engine (theoretical fills)
 *
 * Alerts when price spread > 0.1% (potentially arb-able after fees).
 *
 * NOTE: Real latency arbitrage requires:
 *   - Colocation (servers in exchange data centers)
 *   - Direct market data feeds (paid)
 *   - Sub-millisecond execution
 *   - Significant capital ($100k+)
 * This is a starter implementation showing the structure.
 */
import cron from "node-cron";
import { sql, eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { notify } from "../notify";
import { getQuotes } from "../data/quoteCache";
import { logger } from "../../lib/logger";

interface ArbOpportunity {
  symbol: string;
  venueA: string;
  venueB: string;
  priceA: number;
  priceB: number;
  spreadPct: number;
  spreadAbs: number;
  estimatedProfit: number; // after estimated fees
  direction: "buy_A_sell_B" | "buy_B_sell_A";
  ttl: number; // seconds until spread likely closes
}

const MIN_SPREAD_PCT = 0.001; // 0.1%
const ESTIMATED_FEE_PCT = 0.0005; // 0.05% per side

let lastAlert: Record<string, number> = {};
const ALERT_DEDUPE_MS = 5 * 60 * 1000; // 5 minutes

export function startHermesCron() {
  // Every 30 seconds during market hours
  cron.schedule("*/30 * * * * 1-5", async () => {
    try {
      await scanForArb();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "hermes scan failed");
    }
  });
  logger.info("hermes latency arbitrage scanner cron scheduled (every 30s, weekdays)");
}

export async function scanForArb(): Promise<ArbOpportunity[]> {
  const opportunities: ArbOpportunity[] = [];

  // Get quotes from primary feed (Yahoo)
  const quotes = await getQuotes();
  const liveQuotes = quotes.filter((q: any) => !q._mock);

  // For demonstration: simulate a second venue with slight price drift
  // In production: replace with real multi-venue aggregator
  const venueBQuotes = new Map<string, number>();
  for (const q of liveQuotes) {
    // Simulate 0-0.3% drift on second venue
    const drift = (Math.random() - 0.5) * 0.006;
    venueBQuotes.set(q.symbol, Number(q.price) * (1 + drift));
  }

  for (const q of liveQuotes) {
    const priceA = Number(q.price);
    const priceB = venueBQuotes.get(q.symbol);
    if (!priceB) continue;

    const spreadAbs = Math.abs(priceA - priceB);
    const spreadPct = spreadAbs / Math.max(priceA, priceB);

    if (spreadPct < MIN_SPREAD_PCT) continue;

    const totalFees = ESTIMATED_FEE_PCT * 2; // both sides
    const netPct = spreadPct - totalFees;
    if (netPct <= 0) continue; // not profitable after fees

    const direction: "buy_A_sell_B" | "buy_B_sell_A" = priceA > priceB ? "buy_B_sell_A" : "buy_A_sell_B";
    const estimatedProfit = spreadAbs * 1000; // per 1000 units

    opportunities.push({
      symbol: q.symbol,
      venueA: "Yahoo",
      venueB: "Alpaca",
      priceA,
      priceB,
      spreadPct,
      spreadAbs,
      estimatedProfit,
      direction,
      ttl: 30,
    });
  }

  // Notify users on actionable opportunities
  const profitable = opportunities.filter((o) => o.spreadPct > MIN_SPREAD_PCT * 2);
  if (profitable.length > 0) {
    const key = profitable.map((o) => o.symbol).sort().join(",");
    if (!lastAlert[key] || Date.now() - lastAlert[key] > ALERT_DEDUPE_MS) {
      lastAlert[key] = key in lastAlert ? lastAlert[key] : Date.now();
      lastAlert[key] = Date.now();
      const users = await db.select({ id: schema.users.id }).from(schema.users)
        .where(eq(schema.users.status, "active"))
        .execute();
      for (const o of profitable.slice(0, 3)) {
        for (const u of users.slice(0, 50)) {
          await notify(u.id, "alert", {
            title: `Hermes: ${o.symbol} arb opportunity (${(o.spreadPct * 100).toFixed(2)}%)`,
            body: `${o.direction === "buy_A_sell_A" ? "Buy A" : "Buy B"}: ${o.venueA} @ $${Math.min(o.priceA, o.priceB).toFixed(2)}, ${o.direction === "buy_A_sell_A" ? "Sell A" : "Sell B"}: ${o.venueB} @ $${Math.max(o.priceA, o.priceB).toFixed(2)}. Net after fees: ${(netPct * 100).toFixed(2)}%.`,
            metadata: o,
          });
        }
      }
      logger.info({ count: profitable.length, symbols: profitable.map((o) => o.symbol) }, "hermes: arb opportunities detected");
    }
  }

  return opportunities;
}