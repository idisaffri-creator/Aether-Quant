import { Router } from "express";
import { db } from "../db";
import { redis, isRedisHealthy } from "../lib/redis";
import { register } from "../lib/metrics";

const router = Router();

/**
 * GET /health — basic liveness, never fails.
 * Used by Traefik / k8s liveness probe.
 */
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptimeSec: process.uptime() });
});

/**
 * GET /live — liveness probe.
 * Returns 200 if the process is alive. No dependency checks.
 */
router.get("/live", (_req, res) => {
  res.json({ status: "alive", pid: process.pid });
});

/**
 * GET /ready — readiness probe.
 * Returns 200 only if all dependencies (DB, Redis) are reachable.
 * Returns 503 with details if any are degraded.
 */
router.get("/ready", async (_req, res) => {
  const checks: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {};
  const t0 = Date.now();
  try {
    await db.execute("SELECT 1" as any);
    checks.database = { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    checks.database = { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
  }
  const t1 = Date.now();
  const redisOk = await isRedisHealthy();
  checks.redis = { ok: redisOk, latencyMs: Date.now() - t1 };

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /metrics — Prometheus exposition.
 * Scrape every 15-30s. No auth (intended to be private network / scraped by Prom).
 * Lock down with firewall or basic auth at the reverse proxy.
 */
router.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

export default router;
