/**
 * Tournament mode — time-bound competitions between users.
 *
 * GET   /api/tournaments                - list all tournaments
 * GET   /api/tournaments/:id            - get one + leaderboard
 * POST  /api/tournaments/:id/join      - join a tournament
 * DELETE /api/tournaments/:id/leave    - leave before start
 * GET   /api/tournaments/:id/leaderboard - top 50
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, sql, asc, gte, lte } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(schema.tournaments)
      .orderBy(desc(schema.tournaments.startsAt))
      .limit(50)
      .execute();
    // Add entry counts
    const enriched = await Promise.all(rows.map(async (t) => {
      const count = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.tournamentEntries)
        .where(eq(schema.tournamentEntries.tournamentId, t.id))
        .execute();
      return { ...t, participantCount: count[0]?.count || 0 };
    }));
    res.json({ tournaments: enriched });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "tournaments list failed");
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.tournaments)
      .where(eq(schema.tournaments.id, req.params.id))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Tournament not found", status: 404 });
      return;
    }
    const leaderboard = await db.select().from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, req.params.id))
      .orderBy(desc(schema.tournamentEntries.totalPnlPct))
      .limit(50)
      .execute();
    // Add username
    const userIds = leaderboard.map(e => e.userId);
    const users = userIds.length > 0 ? await db.select({ id: schema.users.id, username: schema.users.username, tier: schema.users.tier })
      .from(schema.users)
      .execute() : [];
    const userMap = new Map(users.map(u => [u.id, u]));
    const enriched = leaderboard.map((e, i) => ({
      ...e,
      rank: i + 1,
      username: userMap.get(e.userId)?.username || "anonymous",
      tier: userMap.get(e.userId)?.tier || "free",
    }));
    res.json({ tournament: rows[0], leaderboard: enriched });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.get("/:id/leaderboard", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const leaderboard = await db.select().from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, req.params.id))
      .orderBy(desc(schema.tournamentEntries.totalPnlPct))
      .limit(limit)
      .execute();
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    // Get tournament
    const t = await db.select().from(schema.tournaments)
      .where(eq(schema.tournaments.id, req.params.id))
      .execute();
    if (t.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Tournament not found", status: 404 });
      return;
    }
    if (t[0].status === "completed") {
      res.status(400).json({ code: "TOURNAMENT_ENDED", message: "Tournament has ended", status: 400 });
      return;
    }
    // Check if already joined
    const existing = await db.select().from(schema.tournamentEntries)
      .where(and(
        eq(schema.tournamentEntries.tournamentId, req.params.id),
        eq(schema.tournamentEntries.userId, req.user!.userId),
      ))
      .execute();
    if (existing.length > 0) {
      res.status(409).json({ code: "ALREADY_JOINED", message: "Already joined", status: 409 });
      return;
    }
    // Check max participants
    const count = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, req.params.id))
      .execute();
    if ((count[0]?.count || 0) >= t[0].maxParticipants) {
      res.status(400).json({ code: "FULL", message: "Tournament is full", status: 400 });
      return;
    }
    const id = nanoid();
    const startingBalance = Number(t[0].startingBalance);
    await db.insert(schema.tournamentEntries).values({
      id,
      tournamentId: req.params.id,
      userId: req.user!.userId,
      startingBalance: startingBalance.toString(),
      currentEquity: startingBalance.toString(),
      totalPnl: "0",
      totalPnlPct: "0",
      trades: 0,
    }).execute();
    logger.info({ userId: req.user!.userId, tournamentId: req.params.id }, "tournament joined");
    res.status(201).json({ id, message: "Joined tournament" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "tournament join failed");
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.delete("/:id/leave", authMiddleware, async (req, res) => {
  try {
    await db.delete(schema.tournamentEntries)
      .where(and(
        eq(schema.tournamentEntries.tournamentId, req.params.id),
        eq(schema.tournamentEntries.userId, req.user!.userId),
      ))
      .execute();
    res.json({ message: "Left tournament" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL" });
  }
});

/**
 * Recalculate tournament leaderboard (called by cron or on trade).
 */
export async function recalculateTournament(tournamentId: string) {
  try {
    // Get tournament
    const t = await db.select().from(schema.tournaments)
      .where(eq(schema.tournaments.id, tournamentId))
      .execute();
    if (t.length === 0) return;
    const tournament = t[0];
    // Get all entries
    const entries = await db.select().from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, tournamentId))
      .execute();
    // For each entry, calculate equity from positions + realized P&L
    for (const entry of entries) {
      const positions = await db.select().from(schema.positions)
        .where(eq(schema.positions.userId, entry.userId))
        .execute();
      const realized = Number(entry.startingBalance) + positions.reduce((sum, p) => sum + Number(p.realizedPnl || 0), 0);
      // For demo: current equity = starting + sum of realized
      const currentEquity = realized;
      const totalPnl = currentEquity - Number(entry.startingBalance);
      const totalPnlPct = totalPnl / Number(entry.startingBalance);
      const trades = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.userId, entry.userId),
          eq(schema.orders.status, "filled"),
        ))
        .execute();
      await db.update(schema.tournamentEntries)
        .set({
          currentEquity: currentEquity.toString(),
          totalPnl: totalPnl.toString(),
          totalPnlPct: totalPnlPct.toString(),
          trades: trades[0]?.count || 0,
          lastUpdated: new Date(),
        })
        .where(eq(schema.tournamentEntries.id, entry.id))
        .execute();
    }
    // Update ranks
    const sorted = await db.select().from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, tournamentId))
      .orderBy(desc(schema.tournamentEntries.totalPnlPct))
      .execute();
    for (let i = 0; i < sorted.length; i++) {
      await db.update(schema.tournamentEntries)
        .set({ rank: i + 1 })
        .where(eq(schema.tournamentEntries.id, sorted[i].id))
        .execute();
    }
    // Update tournament status based on dates
    const now = new Date();
    if (now < tournament.startsAt) {
      await db.update(schema.tournaments)
        .set({ status: "upcoming" })
        .where(eq(schema.tournaments.id, tournamentId))
        .execute();
    } else if (now >= tournament.startsAt && now <= tournament.endsAt) {
      await db.update(schema.tournaments)
        .set({ status: "active" })
        .where(eq(schema.tournaments.id, tournamentId))
        .execute();
    } else {
      await db.update(schema.tournaments)
        .set({ status: "completed" })
        .where(eq(schema.tournaments.id, tournamentId))
        .execute();
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, tournamentId }, "tournament recalc failed");
  }
}

/**
 * Auto-create demo tournament on first run.
 */
export async function ensureDemoTournament() {
  try {
    const existing = await db.select().from(schema.tournaments).execute();
    if (existing.length > 0) return;
    const now = new Date();
    const startsAt = new Date(now);
    startsAt.setHours(0, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 30);
    await db.insert(schema.tournaments).values({
      id: nanoid(),
      name: "Q3 2026 Energy Trading Cup",
      description: "30-day paper trading competition. Top 10 by P&L win bragging rights + a featured spot on the leaderboard. Trade crude oil, natural gas, gold, and silver with $100k virtual capital.",
      startingBalance: "100000",
      startsAt,
      endsAt,
      status: "active",
      maxParticipants: 200,
      prizePool: "Featured on leaderboard · Custom strategy showcase",
    }).execute();
    logger.info("demo tournament created (Q3 2026 Energy Trading Cup)");
  } catch (err) {
    logger.error({ err: (err as Error).message }, "demo tournament creation failed");
  }
}

export default router;
