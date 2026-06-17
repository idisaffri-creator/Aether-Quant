import { Router } from "express";
import { getDataStatus } from "../services/data/ingest";
import { listEiaSeries } from "../services/data/adapters/eia";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/data/status
 * Returns the health of every data feed: yahoo, eia, newsapi, gdelt, ollama,
 * plus the last-run timestamp of each ingest loop.
 *
 * Public — no auth (it's just status; no secrets).
 */
router.get("/status", async (_req, res) => {
  try {
    const s = await getDataStatus();
    const eiaConfigured = s.eia.configured;
    const newsapiConfigured = s.newsapi.configured;
    res.json({
      ...s,
      eiaSeries: listEiaSeries().map((x) => ({ id: x.id, name: x.name, unit: x.unit })),
      // Hint what user can do to improve coverage
      upgrade: {
        eia: eiaConfigured ? null : "Set EIA_API_KEY for crude/ngas fundamentals (free: 2,500 req/day)",
        newsapi: newsapiConfigured ? null : "Set NEWSAPI_KEY for 100 req/day curated headlines",
        ollama: s.ollama.reachable ? null : "Run Ollama locally for free sentiment scoring (llama3.1:8b)",
      },
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "data status failed");
    res.status(500).json({ code: "INTERNAL", message: "data status failed" });
  }
});

export default router;
