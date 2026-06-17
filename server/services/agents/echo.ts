/**
 * Echo — Trade Journal Analyzer
 *
 * Reads user's trade journal + actual fill history, surfaces behavioral insights:
 *   - "You hold losers 2.3x longer than winners" (disposition effect)
 *   - "Your best day is Wednesday — you're +12% on Wednesdays across 47 trades"
 *   - "You revenge-trade after losses (3x more likely to trade within 1hr of a loss)"
 *   - "Symbols you should probably stop trading: NG (8 trades, -18%)"
 *
 * Runs weekly for each user with journal entries.
 */
import cron from "node-cron";
import { eq, and, sql, desc, gt } from "drizzle-orm";
import { db, schema } from "../../db";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

interface JournalInsight {
  userId: string;
  type: "disposition" | "revenge_trading" | "best_day" | "worst_symbol" | "tag_performance" | "streak";
  title: string;
  description: string;
  data: any;
}

export function startEchoCron() {
  // Every Sunday 8pm UTC
  cron.schedule("0 20 * * 0", async () => {
    try {
      await analyzeAllUsers();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "echo weekly analysis failed");
    }
  });
  logger.info("echo trade journal analyzer cron scheduled (weekly Sun 8pm UTC)");
}

export async function analyzeUser(userId: string): Promise<JournalInsight[]> {
  const insights: JournalInsight[] = [];

  // Get all filled orders for this user
  const orders = await db.select().from(schema.orders)
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "filled")))
    .orderBy(schema.orders.createdAt)
    .execute();

  if (orders.length < 10) return insights; // need minimum sample size

  // Get journal entries for context
  const journal = await db.select().from(schema.tradeJournal)
    .where(eq(schema.tradeJournal.userId, userId))
    .execute();

  // === Insight 1: Disposition effect ===
  // For each buy/sell pair, measure time held
  const buyOrders = orders.filter((o) => o.side === "buy");
  const sellOrders = orders.filter((o) => o.side === "sell");
  let winnersTime: number[] = [];
  let losersTime: number[] = [];

  for (const buy of buyOrders) {
    const matchingSell = sellOrders.find(
      (s) => s.symbol === buy.symbol && new Date(s.createdAt) > new Date(buy.createdAt)
    );
    if (!matchingSell) continue;
    const heldMs = new Date(matchingSell.createdAt).getTime() - new Date(buy.createdAt).getTime();
    const isWinner = Number(matchingSell.avgFillPrice || 0) > Number(buy.avgFillPrice || 0);
    if (isWinner) winnersTime.push(heldMs);
    else losersTime.push(heldMs);
  }

  if (winnersTime.length >= 3 && losersTime.length >= 3) {
    const avgWinnerMs = winnersTime.reduce((s, t) => s + t, 0) / winnersTime.length;
    const avgLoserMs = losersTime.reduce((s, t) => s + t, 0) / losersTime.length;
    const ratio = avgLoserMs / avgWinnerMs;
    if (ratio > 1.8) {
      insights.push({
        userId,
        type: "disposition",
        title: "You hold losers too long",
        description: `You hold losing positions ${ratio.toFixed(1)}x longer than winners (${formatHours(avgLoserMs)} vs ${formatHours(avgWinnerMs)}). Classic disposition effect. Consider setting time-based stops.`,
        data: { ratio, avgWinnerMs, avgLoserMs },
      });
    }
  }

  // === Insight 2: Revenge trading ===
  let revengeCount = 0;
  let totalAfterLoss = 0;
  for (let i = 1; i < orders.length; i++) {
    const prev = orders[i - 1];
    const curr = orders[i];
    const timeDiff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    const prevWasLoss = prev.side === "sell" && Number(prev.avgFillPrice || 0) < Number(prev.limitPrice || 0);
    if (prevWasLoss && timeDiff < 3600000) { // within 1 hour
      totalAfterLoss++;
      const currWasLoss = curr.side === "sell" && Number(curr.avgFillPrice || 0) < Number(curr.limitPrice || 0);
      if (currWasLoss) revengeCount++;
    }
  }
  if (totalAfterLoss >= 5 && revengeCount / totalAfterLoss > 0.6) {
    insights.push({
      userId,
      type: "revenge_trading",
      title: "Revenge trading detected",
      description: `${revengeCount}/${totalAfterLoss} (${((revengeCount / totalAfterLoss) * 100).toFixed(0)}%) of trades within 1hr of a loss are also losses. Take a 2hr break after a loss.`,
      data: { revengeCount, totalAfterLoss },
    });
  }

  // === Insight 3: Best day of week ===
  const dayPnl: Record<string, number> = {};
  for (const o of orders) {
    if (o.side !== "sell") continue;
    const day = new Date(o.createdAt).toLocaleDateString("en-US", { weekday: "long" });
    const pnl = Number(o.avgFillPrice || 0) - Number(o.limitPrice || 0);
    dayPnl[day] = (dayPnl[day] || 0) + pnl;
  }
  const days = Object.entries(dayPnl).sort((a, b) => b[1] - a[1]);
  if (days.length >= 3 && days[0][1] > 100) {
    insights.push({
      userId,
      type: "best_day",
      title: `Your best day is ${days[0][0]}`,
      description: `You average +$${days[0][1].toFixed(0)} on ${days[0][0]}s across ${orders.filter((o) => o.side === "sell" && new Date(o.createdAt).toLocaleDateString("en-US", { weekday: "long" }) === days[0][0]).length} trades. Size up on this day.`,
      data: { day: days[0][0], avgPnl: days[0][1] },
    });
  }

  // === Insight 4: Worst symbol ===
  const symbolPnl: Record<string, number> = {};
  for (const o of orders) {
    if (o.side !== "sell") continue;
    const key = o.symbol;
    symbolPnl[key] = (symbolPnl[key] || 0) + (Number(o.avgFillPrice || 0) - Number(o.limitPrice || 0));
  }
  const worstSymbol = Object.entries(symbolPnl).sort((a, b) => a[1] - b[1])[0];
  if (worstSymbol && worstSymbol[1] < -200) {
    const tradeCount = orders.filter((o) => o.symbol === worstSymbol[0]).length;
    insights.push({
      userId,
      type: "worst_symbol",
      title: `Consider quitting ${worstSymbol[0]}`,
      description: `You've lost $${Math.abs(worstSymbol[1]).toFixed(0)} trading ${worstSymbol[0]} across ${tradeCount} trades. Your edge is in other symbols — focus there.`,
      data: { symbol: worstSymbol[0], pnl: worstSymbol[1], tradeCount },
    });
  }

  return insights;
}

async function analyzeAllUsers() {
  const users = await db.select({ id: schema.users.id }).from(schema.users).execute();
  let analyzed = 0;
  for (const u of users) {
    const insights = await analyzeUser(u.id);
    if (insights.length > 0) {
      // Send the top 2 most actionable insights
      const top = insights.slice(0, 2);
      for (const insight of top) {
        await notify(u.id, "alert", {
          title: insight.title,
          body: insight.description,
          metadata: { type: insight.type, data: insight.data },
        });
      }
      analyzed++;
    }
  }
  logger.info({ analyzed, users: users.length }, "echo: weekly insights sent");
}

function formatHours(ms: number): string {
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(ms / 60000)}min`;
  if (hours < 24) return `${hours.toFixed(1)}hr`;
  return `${(hours / 24).toFixed(1)}d`;
}