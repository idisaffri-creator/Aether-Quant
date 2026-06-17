import { Router, type Request, type Response } from "express";
import { getDataStatus } from "../services/data/ingest";
import { isRedisHealthy } from "../lib/redis";
import { client } from "../db";
import { version as pkgVersion } from "../../package.json";

const router = Router();

let lastPgLatencyMs = 0;
async function pgPing() {
  const t0 = Date.now();
  try {
    await client`SELECT 1`;
    lastPgLatencyMs = Date.now() - t0;
    return { ok: true, latencyMs: lastPgLatencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
  }
}

router.get("/ui", async (_req: Request, res: Response) => {
  const dbCheck = await pgPing();
  const redisOk = await isRedisHealthy();
  const feeds = await getDataStatus();
  const overall = dbCheck.ok && redisOk ? "operational" : "degraded";
  const overallColor = overall === "operational" ? "#10b981" : "#f59e0b";
  const startTime = Date.now();

  // Render a self-contained HTML page (no CDN deps, no external assets)
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-store");
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aether Energy · System Status</title>
  <meta name="robots" content="noindex" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0e; color: #e5e5e5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.1rem; margin: 2rem 0 1rem; color: #a3a3a3; }
    .overall { background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .dot { width: 1rem; height: 1rem; border-radius: 50%; background: ${overallColor}; box-shadow: 0 0 12px ${overallColor}; }
    .label { font-weight: 600; font-size: 1.1rem; }
    .meta { color: #71717a; font-size: 0.85rem; margin-top: 0.25rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 0.5rem; padding: 1rem; }
    .card h3 { font-size: 0.85rem; color: #a3a3a3; margin-bottom: 0.5rem; }
    .card .v { font-size: 1.1rem; font-weight: 600; }
    .ok { color: #10b981; }
    .warn { color: #f59e0b; }
    .err { color: #ef4444; }
    .feed { padding: 0.75rem; background: #0f0f12; border-radius: 0.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; }
    .feed .name { font-weight: 500; }
    .feed .status { font-size: 0.85rem; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #27272a; color: #71717a; font-size: 0.8rem; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <h1>Aether Energy · System Status</h1>
  <div class="overall">
    <div class="dot"></div>
    <div>
      <div class="label">${overall === "operational" ? "All systems operational" : "Partial degradation"}</div>
      <div class="meta">Aether Energy v${pkgVersion} · uptime ${Math.floor(process.uptime())}s · ${new Date().toISOString()}</div>
    </div>
  </div>

  <h2>Core services</h2>
  <div class="grid">
    <div class="card">
      <h3>Database</h3>
      <div class="v ${dbCheck.ok ? "ok" : "err"}">${dbCheck.ok ? "Operational" : "Down"}</div>
      <div class="meta">${dbCheck.ok ? "Latency: " + dbCheck.latencyMs + "ms" : (dbCheck.error || "")}</div>
    </div>
    <div class="card">
      <h3>Redis</h3>
      <div class="v ${redisOk ? "ok" : "err"}">${redisOk ? "Operational" : "Down"}</div>
    </div>
  </div>

  <h2>Data feeds</h2>
  <div class="feed">
    <span class="name">Yahoo Finance <span class="meta" style="color:#71717a">(${feeds.yahoo.symbolCount} symbols)</span></span>
    <span class="status ${feeds.yahoo.healthy ? "ok" : "warn"}">${feeds.yahoo.healthy ? "Live" : "Degraded"} · ${feeds.yahoo.latencyMs}ms</span>
  </div>
  <div class="feed">
    <span class="name">EIA (U.S. Energy Info Admin) <span class="meta" style="color:#71717a">${feeds.eia.configured ? "(configured)" : "(not configured)"}</span></span>
    <span class="status ${feeds.eia.healthy ? "ok" : "warn"}">${feeds.eia.healthy ? "Live" : "Off"}</span>
  </div>
  <div class="feed">
    <span class="name">NewsAPI <span class="meta" style="color:#71717a">${feeds.newsapi.configured ? `(remaining ${feeds.newsapi.remaining})` : "(not configured)"}</span></span>
    <span class="status ${feeds.newsapi.healthy ? "ok" : "warn"}">${feeds.newsapi.healthy ? "Live" : "Off"}</span>
  </div>
  <div class="feed">
    <span class="name">GDELT (free events DB)</span>
    <span class="status ${feeds.gdelt.healthy ? "ok" : "warn"}">${feeds.gdelt.healthy ? "Live" : "Degraded"}</span>
  </div>
  <div class="feed">
    <span class="name">Ollama (local sentiment)</span>
    <span class="status ${feeds.ollama.reachable ? "ok" : "warn"}">${feeds.ollama.reachable ? "Live (" + feeds.ollama.model + ")" : "Unavailable"}</span>
  </div>

  <h2>Ingest worker</h2>
  <div class="card">
    <div class="v" style="font-size: 0.9rem; font-family: ui-monospace, monospace;">
      quotes:    ${feeds.lastRun.quotes || "never"}<br>
      eia:       ${feeds.lastRun.eia || "never"}<br>
      news:      ${feeds.lastRun.news || "never"}<br>
      signals:   ${feeds.lastRun.signals || "never"}
    </div>
  </div>

  <div class="footer">
    Auto-refresh every 30s · <a href="/status">text</a> · <a href="/status/json">JSON</a> · <a href="/api/openapi.json">API</a> · <a href="/api/docs">docs</a>
    <script>setTimeout(() => location.reload(), 30000);</script>
  </div>
</body>
</html>`);
});

export default router;
