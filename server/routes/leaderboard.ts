/**
 * Leaderboard — top performers by P&L.
 * GET /api/leaderboard           - top 50 users by P&L
 * GET /api/leaderboard/me        - my stats + rank
 */
import { Router } from "express";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { eq, sql, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  tier: string;
  totalPnl: number;
  totalTrades: number;
  totalPositions: number;
  exposure: number;
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    // Aggregate per user: realized PnL from positions + trade count from orders
    const pnlRows = await db.select({
      userId: schema.positions.userId,
      totalPnl: sql<string>`COALESCE(SUM(${schema.positions.realizedPnl}::numeric), 0)`,
      totalPositions: sql<number>`COUNT(*)::int`,
      exposure: sql<string>`COALESCE(SUM(${schema.positions.quantity}::numeric * ${schema.positions.avgEntryPrice}::numeric), 0)`,
    })
      .from(schema.positions)
      .groupBy(schema.positions.userId)
      .execute();

    const tradeRows = await db.select({
      userId: schema.orders.userId,
      totalTrades: sql<number>`COUNT(*)::int`,
    })
      .from(schema.orders)
      .where(eq(schema.orders.status, "filled"))
      .groupBy(schema.orders.userId)
      .execute();

    const tradeMap = new Map<string, number>(tradeRows.map(r => [r.userId, r.totalTrades]));

    // Get user info
    const userRows = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      tier: schema.users.tier,
    }).from(schema.users).execute();
    const userMap = new Map(userRows.map(u => [u.id, u]));

    const entries: LeaderboardEntry[] = pnlRows
      .map((p, i) => {
        const user = userMap.get(p.userId);
        return {
          rank: 0, // assigned after sort
          userId: p.userId,
          username: user?.username || "anonymous",
          tier: user?.tier || "free",
          totalPnl: Number(p.totalPnl || 0),
          totalTrades: tradeMap.get(p.userId) || 0,
          totalPositions: Number(p.totalPositions || 0),
          exposure: Number(p.exposure || 0),
        };
      })
      .sort((a, b) => b.totalPnl - a.totalPnl)
      .slice(0, 50)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    res.json({ leaderboard: entries });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "leaderboard failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to load leaderboard" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const pnlRows = await db.select({
      totalPnl: sql<string>`COALESCE(SUM(${schema.positions.realizedPnl}::numeric), 0)`,
      totalPositions: sql<number>`COUNT(*)::int`,
      exposure: sql<string>`COALESCE(SUM(${schema.positions.quantity}::numeric * ${schema.positions.avgEntryPrice}::numeric), 0)`,
    })
      .from(schema.positions)
      .where(eq(schema.positions.userId, req.user!.userId))
      .execute();

    const tradeRows = await db.select({
      totalTrades: sql<number>`COUNT(*)::int`,
    })
      .from(schema.orders)
      .where(eq(schema.orders.userId, req.user!.userId))
      .execute();

    const myPnl = Number(pnlRows[0]?.totalPnl || 0);

    // Find my rank
    const allPnls = await db.select({
      userId: schema.positions.userId,
      totalPnl: sql<string>`COALESCE(SUM(${schema.positions.realizedPnl}::numeric), 0)`,
    })
      .from(schema.positions)
      .groupBy(schema.positions.userId)
      .execute();
    const sorted = allPnls.map(r => ({ userId: r.userId, pnl: Number(r.totalPnl || 0) })).sort((a, b) => b.pnl - a.pnl);
    const myRank = sorted.findIndex(s => s.userId === req.user!.userId) + 1;

    res.json({
      rank: myRank || null,
      totalUsers: sorted.length,
      totalPnl: myPnl,
      totalTrades: tradeRows[0]?.totalTrades || 0,
      totalPositions: pnlRows[0]?.totalPositions || 0,
      exposure: Number(pnlRows[0]?.exposure || 0),
    });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load my stats" });
  }
});

export default router;
