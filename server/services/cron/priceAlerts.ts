/**
 * Price alert worker — runs every minute.
 * Checks active alerts against current quotes; fires when threshold crossed.
 * Sends notification + optional email/Discord.
 */
import cron from "node-cron";
import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { getQuotes } from "../data/quoteCache";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

export function startPriceAlertCron() {
  // Every minute
  cron.schedule("* * * * *", async () => {
    try {
      await checkAlerts();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "price alert cron failed");
    }
  });
  logger.info("price alert cron scheduled (every minute)");
}

async function checkAlerts() {
  // Get all active alerts grouped by symbol to minimize API calls
  const allAlerts = await db.select().from(schema.priceAlerts)
    .where(eq(schema.priceAlerts.active, 1))
    .execute();
  if (allAlerts.length === 0) return;

  const symbols = Array.from(new Set(allAlerts.map((a) => a.symbol)));
  const quotes = await getQuotes();
  const priceMap = new Map<string, number>();
  for (const q of quotes) {
    if (symbols.includes(q.symbol)) priceMap.set(q.symbol, Number(q.price));
  }

  let fired = 0;
  for (const alert of allAlerts) {
    if (alert.triggeredAt && alert.triggerOnce === 1) continue;
    const currentPrice = priceMap.get(alert.symbol);
    if (!currentPrice) continue;
    const threshold = Number(alert.threshold);
    const prev = alert.currentPrice ? Number(alert.currentPrice) : null;

    let shouldFire = false;
    if (alert.condition === "above" && currentPrice >= threshold) shouldFire = true;
    else if (alert.condition === "below" && currentPrice <= threshold) shouldFire = true;
    else if (alert.condition === "crosses" && prev !== null) {
      const wasAbove = prev > threshold;
      const isAbove = currentPrice > threshold;
      if (wasAbove !== isAbove) shouldFire = true;
    } else if (alert.condition === "crosses" && prev === null) {
      // First check — fire if already crossed
      shouldFire = currentPrice >= threshold;
    }

    if (shouldFire) {
      // Update state
      await db.update(schema.priceAlerts)
        .set({
          triggeredAt: new Date(),
          currentPrice: currentPrice.toString(),
        })
        .where(eq(schema.priceAlerts.id, alert.id))
        .execute();

      // Send notification
      const direction = alert.condition === "above" ? "↑" : alert.condition === "below" ? "↓" : "↔";
      await notify(alert.userId, "alert", {
        title: `${alert.symbol} ${direction} $${threshold.toFixed(2)}`,
        body: `Price is now $${currentPrice.toFixed(2)} (your alert: ${alert.condition} $${threshold.toFixed(2)})`,
        metadata: {
          symbol: alert.symbol,
          condition: alert.condition,
          threshold,
          currentPrice,
          alertId: alert.id,
        },
      });

      fired++;
    } else if (currentPrice !== prev) {
      // Update current price (for "crosses" tracking)
      await db.update(schema.priceAlerts)
        .set({ currentPrice: currentPrice.toString() })
        .where(eq(schema.priceAlerts.id, alert.id))
        .execute();
    }
  }

  if (fired > 0) logger.info({ fired, checked: allAlerts.length }, "price alerts fired");
}