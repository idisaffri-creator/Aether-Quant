/**
 * Argus — Cross-Market Arbitrage Scanner
 *
 * Real-time scanner that watches price relationships between correlated instruments:
 *   - WTI vs Brent spread (typical: $3-7, alert if >$8 or <$2)
 *   - Gold/Silver ratio (typical: 60-90, alert if outside range)
 *   - Crack spread (refining margins: HO-CL or RB-CL)
 *   - Nat gas vs heating oil correlation
 *
 * When a spread deviates beyond historical norms, alerts the user with a
 * pair trade idea.
 */
import cron from "node-cron";
import { db, schema } from "../../db";
import { getQuotes } from "../data/quoteCache";
import { notify } from "../notify";
import { logger } from "../../lib/logger";

// Historical reference spreads (updated quarterly from EIA/CME data)
const SPREAD_NORMS = {
  WTI_BRENT: { mean: 4.5, stddev: 1.8, alertZ: 2.0 }, // Brent typically $3-6 over WTI
  HO_CL: { mean: 0.35, stddev: 0.12, alertZ: 2.0 }, // Heating oil crack spread
  RB_CL: { mean: 0.20, stddev: 0.10, alertZ: 2.0 }, // RBOB crack spread
  GC_SI: { mean: 85, stddev: 8, alertZ: 2.0 }, // Gold/silver ratio
};

interface SpreadOpportunity {
  pair: string;
  current: number;
  mean: number;
  zScore: number;
  thesis: string;
  symbols: [string, string];
}

let lastAlert: Record<string, number> = {}; // dedupe: don't re-alert same opportunity within 4 hours

export function startArgusCron() {
  // Every 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    try {
      await scanSpreads();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "argus scan failed");
    }
  });
  logger.info("argus arbitrage scanner cron scheduled (every 2 min)");
}

export async function scanSpreads(): Promise<SpreadOpportunity[]> {
  const quotes = await getQuotes();
  const qm = new Map<string, number>();
  for (const q of quotes) qm.set(q.symbol, Number(q.price));

  const opportunities: SpreadOpportunity[] = [];

  // WTI vs Brent spread
  const wti = qm.get("CL");
  const brent = qm.get("BZ");
  if (wti && brent) {
    const spread = brent - wti;
    const z = (spread - SPREAD_NORMS.WTI_BRENT.mean) / SPREAD_NORMS.WTI_BRENT.stddev;
    if (Math.abs(z) >= SPREAD_NORMS.WTI_BRENT.alertZ) {
      const thesis = z > 0
        ? `Brent trading at $${brent.toFixed(2)} vs WTI $${wti.toFixed(2)} = $${spread.toFixed(2)} spread (${z.toFixed(1)}σ above mean). Brent typically expensive vs WTI when OPEC cuts supply. Consider short BZ / long CL.`
        : `Brent at $${brent.toFixed(2)} vs WTI $${wti.toFixed(2)} = $${spread.toFixed(2)} spread (${z.toFixed(1)}σ below mean). Brent discount rare — usually signals oversupply. Consider long BZ / short CL.`;
      opportunities.push({
        pair: "WTI-Brent",
        current: spread,
        mean: SPREAD_NORMS.WTI_BRENT.mean,
        zScore: z,
        thesis,
        symbols: ["CL", "BZ"],
      });
    }
  }

  // Heating oil crack spread (HO - CL × 42 gal/bbl / 1000)
  const ho = qm.get("HO");
  if (wti && ho) {
    // CL priced per barrel, HO per gallon. 1 bbl = 42 gal.
    const spreadPerBbl = ho * 42 - wti;
    const z = (spreadPerBbl - SPREAD_NORMS.HO_CL.mean) / SPREAD_NORMS.HO_CL.stddev;
    if (Math.abs(z) >= SPREAD_NORMS.HO_CL.alertZ) {
      const thesis = z > 0
        ? `Crack spread $${spreadPerBbl.toFixed(2)}/bbl (${z.toFixed(1)}σ). Refiners making unusually high margins. Consider long HO / short CL.`
        : `Crack spread $${spreadPerBbl.toFixed(2)}/bbl (${z.toFixed(1)}σ). Refiners underwater. Consider short HO / long CL.`;
      opportunities.push({
        pair: "HO-CL Crack",
        current: spreadPerBbl,
        mean: SPREAD_NORMS.HO_CL.mean,
        zScore: z,
        thesis,
        symbols: ["HO", "CL"],
      });
    }
  }

  // Gold/Silver ratio
  const gold = qm.get("GC");
  const silver = qm.get("SI");
  if (gold && silver) {
    const ratio = gold / silver;
    const z = (ratio - SPREAD_NORMS.GC_SI.mean) / SPREAD_NORMS.GC_SI.stddev;
    if (Math.abs(z) >= SPREAD_NORMS.GC_SI.alertZ) {
      const thesis = z > 0
        ? `Gold/Silver ratio ${ratio.toFixed(1)} (${z.toFixed(1)}σ). Silver cheap relative to gold — risk-on signal. Consider long SI / short GC.`
        : `Gold/Silver ratio ${ratio.toFixed(1)} (${z.toFixed(1)}σ). Silver expensive — risk-off / safe-haven demand. Consider long GC / short SI.`;
      opportunities.push({
        pair: "Gold-Silver Ratio",
        current: ratio,
        mean: SPREAD_NORMS.GC_SI.mean,
        zScore: z,
        thesis,
        symbols: ["GC", "SI"],
      });
    }
  }

  // Notify users with active strategies
  if (opportunities.length > 0) {
    const activeUsers = await db.select({ userId: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.status, "active"))
      .execute();
    
    for (const opp of opportunities) {
      // Dedupe: don't re-alert same opportunity within 4 hours
      const key = `${opp.pair}-${opp.zScore > 0 ? "high" : "low"}`;
      const now = Date.now();
      if (lastAlert[key] && now - lastAlert[key] < 4 * 3600 * 1000) continue;
      lastAlert[key] = now;

      for (const u of activeUsers.slice(0, 100)) { // cap at 100 to avoid spam
        await notify(u.userId, "alert", {
          title: `Argus: ${opp.pair} ${opp.zScore > 0 ? "↑" : "↓"} ${Math.abs(opp.zScore).toFixed(1)}σ`,
          body: opp.thesis,
          metadata: { pair: opp.pair, zScore: opp.zScore, symbols: opp.symbols },
        });
      }
      logger.info({ pair: opp.pair, z: opp.zScore }, "argus opportunity fired");
    }
  }

  return opportunities;
}