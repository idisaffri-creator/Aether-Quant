/**
 * Email digest — daily summary sent at 5pm UTC.
 * Sends to users with preferences.notifications.dailyDigest = true.
 */
import cron from "node-cron";
import { db, schema } from "../../db";
import { gte, eq } from "drizzle-orm";
import { sendEmail, templates, isEmailConfigured } from "../email";
import { logger } from "../../lib/logger";

export function startDailyDigestCron() {
  if (!isEmailConfigured()) {
    logger.info("daily digest cron disabled (no email provider)");
    return;
  }
  // 5pm UTC every day
  cron.schedule("0 17 * * *", async () => {
    try {
      await runDailyDigest();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "daily digest cron failed");
    }
  }, { timezone: "UTC" });
  logger.info("daily digest cron scheduled (17:00 UTC daily)");
}

async function runDailyDigest() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  // Get users who opted in
  const users = await db.select().from(schema.users).execute();
  let sent = 0;
  for (const u of users) {
    try {
      const prefs = (u.preferences as any) || {};
      if (prefs.notifications?.dailyDigest === false) continue;
      // Get today's trades for this user
      const todaysOrders = await db.select().from(schema.orders)
        .where(and(
          eq(schema.orders.userId, u.id),
          gte(schema.orders.filledAt, startOfDay),
        ))
        .execute();
      // Get current equity from positions
      const positions = await db.select().from(schema.positions)
        .where(eq(schema.positions.userId, u.id))
        .execute();
      const equity = positions.reduce((sum, p) => sum + Number(p.quantity) * Number(p.avgEntryPrice) + Number(p.realizedPnl || 0), 100000);
      const realized = positions.reduce((sum, p) => sum + Number(p.realizedPnl || 0), 0);
      const tradeCount = todaysOrders.length;
      const emailMsg = templates.dailyDigest({
        username: u.username,
        equity: equity.toFixed(2),
        realizedPnl: realized.toFixed(2),
        tradeCount,
        positions: positions.length,
      });
      emailMsg.to = u.email;
      const r = await sendEmail(emailMsg);
      if (r.ok) sent++;
    } catch (err) {
      logger.warn({ err: (err as Error).message, userId: u.id }, "digest send failed for user");
    }
  }
  logger.info({ sent, total: users.length }, "daily digest complete");
}
