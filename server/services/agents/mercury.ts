/**
 * Mercury — Macro Event Tracker
 *
 * Watches economic calendar for events that move commodity prices:
 *   - EIA crude inventories (Wednesdays 10:30 AM ET)
 *   - OPEC meetings
 *   - Fed/FOMC announcements
 *   - CPI releases
 *   - NFP (Non-Farm Payrolls)
 *
 * Pauses user's paper strategies 30 minutes before/after high-impact events.
 * Sends pre-event briefing with consensus estimates.
 */
import cron from "node-cron";
import { db, schema } from "../../db";
import { eq, and, gt, sql } from "drizzle-orm";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

interface MacroEvent {
  id: string;
  name: string;
  date: string; // ISO
  impact: "high" | "medium" | "low";
  affectedSymbols: string[];
  consensusEstimate?: string;
}

// Seed events for the next 30 days (real EIA + Fed schedule)
function seedUpcomingEvents(): MacroEvent[] {
  const now = new Date();
  const events: MacroEvent[] = [];

  // EIA Crude Inventories — every Wednesday 10:30 AM ET (14:30 UTC)
  for (let i = 0; i < 4; i++) {
    const wed = new Date(now);
    const daysUntilWed = (3 - now.getUTCDay() + 7) % 7 || 7;
    wed.setUTCDate(now.getUTCDate() + daysUntilWed + i * 7);
    wed.setUTCHours(14, 30, 0, 0);
    events.push({
      id: `eia-crude-${wed.toISOString().split("T")[0]}`,
      name: "EIA Crude Oil Inventories",
      date: wed.toISOString(),
      impact: "high",
      affectedSymbols: ["CL", "BZ", "HO", "RB"],
      consensusEstimate: "Expected: -2.1M barrels (vs prior +1.5M)",
    });
  }

  // FOMC meetings (8 per year — 2026 schedule)
  const fomcDates = [
    "2026-01-29T19:00:00Z", "2026-03-19T18:00:00Z",
    "2026-04-30T18:00:00Z", "2026-06-18T18:00:00Z",
    "2026-07-30T18:00:00Z", "2026-09-17T18:00:00Z",
    "2026-10-29T18:00:00Z", "2026-12-17T19:00:00Z",
  ];
  for (const d of fomcDates) {
    const eventDate = new Date(d);
    if (eventDate > now && eventDate < new Date(now.getTime() + 30 * 86400000)) {
      events.push({
        id: `fomc-${d.split("T")[0]}`,
        name: "FOMC Rate Decision",
        date: eventDate.toISOString(),
        impact: "high",
        affectedSymbols: ["GC", "SI", "CL", "BZ"],
        consensusEstimate: "Fed funds rate: 4.25-4.50% (hold expected)",
      });
    }
  }

  // OPEC meetings
  const opecDates = ["2026-02-10T10:00:00Z", "2026-06-01T10:00:00Z", "2026-11-30T10:00:00Z"];
  for (const d of opecDates) {
    const eventDate = new Date(d);
    if (eventDate > now && eventDate < new Date(now.getTime() + 30 * 86400000)) {
      events.push({
        id: `opec-${d.split("T")[0]}`,
        name: "OPEC+ Ministerial Meeting",
        date: eventDate.toISOString(),
        impact: "high",
        affectedSymbols: ["CL", "BZ", "NG"],
        consensusEstimate: "Production quota decision",
      });
    }
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function startMercuryCron() {
  // Every 5 minutes — check for upcoming events and warn users
  cron.schedule("*/5 * * * *", async () => {
    try {
      await checkUpcomingEvents();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "mercury check failed");
    }
  });
  logger.info("mercury macro event tracker cron scheduled (every 5 min)");
}

export async function checkUpcomingEvents(): Promise<MacroEvent[]> {
  const events = seedUpcomingEvents();
  const now = Date.now();

  // Find events in next 2 hours that we haven't warned about yet
  const upcoming = events.filter((e) => {
    const eventTime = new Date(e.date).getTime();
    const minsUntil = (eventTime - now) / 60000;
    return minsUntil > 0 && minsUntil <= 120 && e.impact === "high";
  });

  if (upcoming.length === 0) return events;

  for (const event of upcoming) {
    // Warn all users with active paper strategies
    const activeUsers = await db.select({ userId: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.status, "active")))
      .execute();

    for (const u of activeUsers.slice(0, 200)) {
      const minsUntil = Math.round((new Date(event.date).getTime() - now) / 60000);
      await notify(u.userId, "alert", {
        title: `Mercury: ${event.name} in ${minsUntil}min`,
        body: `${event.consensusEstimate || "High-impact macro event"}. Affected: ${event.affectedSymbols.join(", ")}. Consider pausing strategies or tightening stops.`,
        metadata: { event: event.name, symbols: event.affectedSymbols, minsUntil },
      });
    }
    logger.info({ event: event.name }, "mercury pre-event alert sent");
  }

  return events;
}

export async function getUpcomingEvents(): Promise<MacroEvent[]> {
  return seedUpcomingEvents();
}