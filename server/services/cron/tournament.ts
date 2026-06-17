/**
 * Tournament cron — recalculates leaderboards every 5 minutes.
 * Also activates/completes tournaments based on date.
 */
import cron from "node-cron";
import { db, schema } from "../../db";
import { logger } from "../../lib/logger";
import { recalculateTournament, ensureDemoTournament } from "../../routes/tournaments";

export function startTournamentCron() {
  // Recalculate all active tournaments every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const tournaments = await db.select().from(schema.tournaments).execute();
      for (const t of tournaments) {
        await recalculateTournament(t.id);
      }
      logger.debug({ count: tournaments.length }, "tournament cron: leaderboards updated");
    } catch (err) {
      logger.error({ err: (err as Error).message }, "tournament cron failed");
    }
  });
  logger.info("tournament cron scheduled (every 5 min)");
}
