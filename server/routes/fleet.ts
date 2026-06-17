/**
 * Public fleet status — shows the 6 named agents and their current state.
 * Powers the LiveTradingFloorSection on the landing page.
 * Public (no auth) — just status, no PII.
 */
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, schema } from "../db";
import { logger } from "../lib/logger";

const router = Router();

router.get("/fleet", async (_req, res) => {
  try {
    // Get live counts for each agent
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    const oneDayAgo = new Date(now.getTime() - 86400 * 1000);

    // Trade count last 24h (Scout, all orders)
    const tradesLast24h = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.orders)
      .where(sql`${schema.orders.createdAt} > ${oneDayAgo.toISOString()}`)
      .execute();

    // Notifications last hour (Press, Hawk activity)
    const notificationsLastHour = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.notifications)
      .where(sql`${schema.notifications.createdAt} > ${oneHourAgo.toISOString()}`)
      .execute();

    // Active custom strategies (Hawk watches these)
    const activeStrategies = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.customStrategies)
      .where(sql`${schema.customStrategies.enabled} = 'true'`)
      .execute();

    // Backtests last 24h (Quincy activity)
    const backtestsLast24h = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.backtests)
      .where(sql`${schema.backtests.createdAt} > ${oneDayAgo.toISOString()}`)
      .execute();

    // Open positions (Hawk watching)
    const openPositions = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.positions)
      .where(sql`${schema.positions.quantity}::numeric > 0`)
      .execute();

    // Marketplace strategies (Sage curates these)
    const marketplaceCount = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.customStrategies)
      .where(sql`${schema.customStrategies.published} = 'true'`)
      .execute();

    // Build fleet response — 15 agents
    const fleet = [
      {
        id: "scout",
        name: "Scout",
        status: "scanning",
        lastAction: `${tradesLast24h[0]?.count || 0} trades processed in last 24h`,
      },
      {
        id: "sherlock",
        name: "Sherlock",
        status: "scanning",
        lastAction: "Regime: Low Vol Trend (CL, BZ)",
      },
      {
        id: "quincy",
        name: "Quincy",
        status: "idle",
        lastAction: `${backtestsLast24h[0]?.count || 0} backtests validated in last 24h`,
      },
      {
        id: "hawk",
        name: "Hawk",
        status: "live",
        lastAction: `Watching ${openPositions[0]?.count || 0} open positions`,
      },
      {
        id: "press",
        name: "Press",
        status: "scanning",
        lastAction: `${notificationsLastHour[0]?.count || 0} alerts sent in last hour`,
      },
      {
        id: "sage",
        name: "Sage",
        status: "idle",
        lastAction: `Curating ${marketplaceCount[0]?.count || 0} marketplace strategies`,
      },
      {
        id: "argus",
        name: "Argus",
        status: "scanning",
        lastAction: "Watching CL-BZ, GC-SI spreads",
      },
      {
        id: "mercury",
        name: "Mercury",
        status: "scanning",
        lastAction: "Next macro event: EIA crude (Wed)",
      },
      {
        id: "echo",
        name: "Echo",
        status: "idle",
        lastAction: "Weekly journal analysis (Sun 8pm UTC)",
      },
      {
        id: "compass",
        name: "Compass",
        status: "idle",
        lastAction: "Daily rebalance (weekdays 4pm ET)",
      },
      {
        id: "atlas",
        name: "Atlas",
        status: "idle",
        lastAction: "COT positioning (Fri 4pm ET)",
      },
      {
        id: "ledger",
        name: "Ledger",
        status: "idle",
        lastAction: "Position reconciliation (weekdays 5pm ET)",
      },
      {
        id: "counsel",
        name: "Counsel",
        status: "scanning",
        lastAction: "Backtest bias review (hourly)",
      },
      {
        id: "librarian",
        name: "Librarian",
        status: "idle",
        lastAction: "Quant papers digest (weekly Mon 8am UTC)",
      },
      {
        id: "hermes",
        name: "Hermes",
        status: "scanning",
        lastAction: "Cross-venue arb scan (every 30s, weekdays)",
      },
    ];

    res.json({ fleet, asOf: now.toISOString() });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "fleet status failed");
    // Don't fail the landing page — return static fallback
    res.json({
      fleet: [
        { id: "scout", name: "Scout", status: "scanning", lastAction: "Watching markets" },
        { id: "sherlock", name: "Sherlock", status: "live", lastAction: "Regime detection" },
        { id: "quincy", name: "Quincy", status: "idle", lastAction: "Strategy validation" },
        { id: "hawk", name: "Hawk", status: "live", lastAction: "Risk monitoring" },
        { id: "press", name: "Press", status: "scanning", lastAction: "News + sentiment" },
        { id: "sage", name: "Sage", status: "idle", lastAction: "Marketplace curation" },
        { id: "argus", name: "Argus", status: "scanning", lastAction: "Arbitrage scanner" },
        { id: "mercury", name: "Mercury", status: "scanning", lastAction: "Macro event tracker" },
        { id: "echo", name: "Echo", status: "idle", lastAction: "Journal analyzer" },
        { id: "compass", name: "Compass", status: "idle", lastAction: "Portfolio rebalancer" },
        { id: "atlas", name: "Atlas", status: "idle", lastAction: "COT positioning" },
        { id: "ledger", name: "Ledger", status: "idle", lastAction: "Position reconciliation" },
        { id: "counsel", name: "Counsel", status: "scanning", lastAction: "Backtest bias detector" },
        { id: "librarian", name: "Librarian", status: "idle", lastAction: "Quant papers digest" },
        { id: "hermes", name: "Hermes", status: "scanning", lastAction: "Cross-venue arbitrage" },
      ],
      asOf: new Date().toISOString(),
    });
  }
});

export default router;