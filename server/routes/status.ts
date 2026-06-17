/**
 * Public status page endpoint — no auth, used by /status UI and external monitors.
 * Returns the same data as /api/data/status plus uptime, version, and active alerts.
 */
import { Router } from "express";
import { isRedisHealthy } from "../lib/redis";
import { getDataStatus } from "../services/data/ingest";
import { client } from "../db";
import { version as pkgVersion } from "../../package.json";
import os from "os";

const router = Router();
const startTime = Date.now();

let lastPgLatencyMs = 0;

async function pgPing(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  try {
    await client`SELECT 1`;
    lastPgLatencyMs = Date.now() - t0;
    return { ok: true, latencyMs: lastPgLatencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
  }
}

/**
 * GET /status
 * Plain text status (for uptime monitors like UptimeRobot).
 * Returns 200 on healthy, 503 on degraded.
 */
router.get("/", async (_req, res) => {
  const dbCheck = await pgPing();
  const redisOk = await isRedisHealthy();
  const healthy = dbCheck.ok && redisOk;
  res.status(healthy ? 200 : 503).type("text/plain").send(
    healthy
      ? `OK\nAether Energy ${pkgVersion}\nuptime: ${Math.floor(process.uptime())}s\ndb: ${dbCheck.latencyMs}ms\nredis: ok\n`
      : `DEGRADED\n${!dbCheck.ok ? "db: " + (dbCheck.error || "down") : ""}\n${!redisOk ? "redis: down" : ""}\n`
  );
});

/**
 * GET /status/json
 * JSON status for programmatic monitoring.
 */
router.get("/json", async (_req, res) => {
  const [dbCheck, redisOk, feeds] = await Promise.all([
    pgPing(),
    isRedisHealthy(),
    getDataStatus(),
  ]);
  const overall = dbCheck.ok && redisOk ? "operational" : "degraded";

  // Identify active alerts
  const alerts: Array<{ level: "info" | "warn" | "error"; message: string }> = [];
  if (!dbCheck.ok) alerts.push({ level: "error", message: `Database: ${dbCheck.error || "down"}` });
  if (!redisOk) alerts.push({ level: "error", message: "Redis: connection failed" });
  if (feeds.newsapi.error) alerts.push({ level: "warn", message: `NewsAPI: ${feeds.newsapi.error}` });
  if (feeds.gdelt.error) alerts.push({ level: "warn", message: `GDELT: ${feeds.gdelt.error}` });
  if (feeds.yahoo.error) alerts.push({ level: "warn", message: `Yahoo: ${feeds.yahoo.error}` });
  if (!feeds.eia.configured) alerts.push({ level: "info", message: "EIA_API_KEY not set — crude fundamentals disabled" });
  if (!feeds.newsapi.configured) alerts.push({ level: "info", message: "NEWSAPI_KEY not set — news from GDELT only" });
  if (!feeds.ollama.reachable) alerts.push({ level: "info", message: "Ollama not reachable — sentiment disabled" });

  res.json({
    overall,
    version: pkgVersion,
    uptime: process.uptime(),
    startedAt: new Date(startTime).toISOString(),
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: os.platform(),
    dependencies: {
      database: dbCheck,
      redis: { ok: redisOk },
    },
    dataFeeds: {
      yahoo: { healthy: feeds.yahoo.healthy, latencyMs: feeds.yahoo.latencyMs, lastFetch: feeds.yahoo.lastFetch, symbolCount: feeds.yahoo.symbolCount },
      eia: { configured: feeds.eia.configured, healthy: feeds.eia.healthy, lastFetch: feeds.eia.lastFetch },
      newsapi: { configured: feeds.newsapi.configured, healthy: feeds.newsapi.healthy, remaining: feeds.newsapi.remaining, lastFetch: feeds.newsapi.lastFetch },
      gdelt: { healthy: feeds.gdelt.healthy, lastFetch: feeds.gdelt.lastFetch },
      ollama: { reachable: feeds.ollama.reachable, model: feeds.ollama.model },
    },
    ingest: feeds.lastRun,
    alerts,
  });
});

export default router;
