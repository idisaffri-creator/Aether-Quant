/**
 * Economic calendar — major market-moving events for energy commodities.
 *
 * Recurring events:
 *   - EIA Crude Inventory (Wednesdays 10:30 AM ET, weekly)
 *   - EIA Natural Gas Storage (Thursdays 10:30 AM ET, weekly)
 *   - OPEC meetings (monthly)
 *   - Fed FOMC meetings (8x/year)
 *   - Baker Hughes rig count (Fridays 1:00 PM ET, weekly)
 *
 * One-off events are loaded from env (ECONOMIC_EVENTS) or hardcoded list.
 */
import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: "eia" | "opec" | "fed" | "economic" | "earnings" | "other";
  importance: "low" | "medium" | "high";
  date: string; // ISO
  affectedSymbols: string[];
  recurring?: string;
}

function nextWeekday(dayOfWeek: number, hour: number = 14, minute: number = 30): Date {
  const now = new Date();
  const date = new Date(now);
  date.setUTCHours(hour, minute, 0, 0);
  const diff = (dayOfWeek - now.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + (diff === 0 && date <= now ? 7 : diff));
  return date;
}

function generateRecurringEvents(): CalendarEvent[] {
  const now = new Date();
  const events: CalendarEvent[] = [];
  // Generate 4 weeks of recurring events
  for (let week = 0; week < 4; week++) {
    const wed = new Date(now);
    wed.setUTCDate(wed.getUTCDate() + ((3 - wed.getUTCDay() + 7) % 7) + week * 7);
    wed.setUTCHours(14, 30, 0, 0); // 10:30 AM ET = 14:30 UTC (during EST)
    if (wed > now) {
      events.push({
        id: `eia-crude-${wed.toISOString().split("T")[0]}`,
        title: "EIA Crude Oil Inventory",
        description: "Weekly U.S. crude oil stockpile change. Major volatility expected.",
        type: "eia",
        importance: "high",
        date: wed.toISOString(),
        affectedSymbols: ["WTI", "BRENT", "HEATOIL", "GASOL"],
        recurring: "weekly",
      });
    }
    const thu = new Date(wed);
    thu.setUTCDate(thu.getUTCDate() + 1);
    thu.setUTCHours(14, 30, 0, 0);
    if (thu > now) {
      events.push({
        id: `eia-gas-${thu.toISOString().split("T")[0]}`,
        title: "EIA Natural Gas Storage",
        description: "Weekly U.S. natural gas storage report.",
        type: "eia",
        importance: "high",
        date: thu.toISOString(),
        affectedSymbols: ["NGAS"],
        recurring: "weekly",
      });
    }
    const fri = new Date(wed);
    fri.setUTCDate(fri.getUTCDate() + 2);
    fri.setUTCHours(17, 0, 0, 0); // 1 PM ET
    if (fri > now) {
      events.push({
        id: `rig-count-${fri.toISOString().split("T")[0]}`,
        title: "Baker Hughes Rig Count",
        description: "Weekly U.S. oil & gas rig count.",
        type: "economic",
        importance: "medium",
        date: fri.toISOString(),
        affectedSymbols: ["WTI", "BRENT", "NGAS"],
        recurring: "weekly",
      });
    }
  }
  return events;
}

const ONE_OFF_EVENTS: CalendarEvent[] = [
  {
    id: "opec-monthly",
    title: "OPEC+ Monthly Meeting",
    description: "Production decision announcement. Expect high volatility.",
    type: "opec",
    importance: "high",
    date: nextWeekday(0, 11, 0).toISOString(), // approximate
    affectedSymbols: ["WTI", "BRENT"],
    recurring: "monthly",
  },
];

router.get("/calendar", authMiddleware, (_req, res) => {
  const events = [...generateRecurringEvents(), ...ONE_OFF_EVENTS]
    .filter(e => new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30);
  res.json({ events });
});

router.get("/calendar/upcoming", authMiddleware, (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const events = [...generateRecurringEvents(), ...ONE_OFF_EVENTS]
    .filter(e => new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
  res.json({ events });
});

export default router;
