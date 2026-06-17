/**
 * Alert webhook — receives Sentry/Healthcheck/Datadog alerts and
 * forwards to Slack/Discord via the configured webhook URL.
 *
 * Config:
 *   ALERT_WEBHOOK_URL  - destination (Slack incoming webhook, Discord, etc.)
 *   ALERT_WEBHOOK_TOKEN - shared secret to verify inbound requests
 *
 * Sentry config: in Sentry dashboard, add a webhook alert that posts to
 *   https://aether-energy.ai/api/alerts/sentry
 *   with header X-Alert-Token: <ALERT_WEBHOOK_TOKEN>
 *
 * Discord config: see docs/discord-webhook.md for the trade-fill Discord embeds.
 */
import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

interface SentryAlert {
  id: string;
  project: string;
  level: "info" | "warning" | "error" | "fatal";
  message: string;
  url?: string;
  culprit?: string;
  event?: { tags?: Record<string, string>; user?: { email?: string } };
}

async function forwardToSlack(payload: any, summary: string) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    logger.warn("ALERT_WEBHOOK_URL not set — alert not forwarded");
    return;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: summary, attachments: [{ text: JSON.stringify(payload, null, 2).slice(0, 1500) }] }),
    });
    if (!r.ok) logger.warn({ status: r.status }, "alert forward failed");
  } catch (err) {
    logger.error({ err: (err as Error).message }, "alert forward exception");
  }
}

router.post("/sentry", async (req: Request, res: Response) => {
  const token = process.env.ALERT_WEBHOOK_TOKEN;
  if (token && req.headers["x-alert-token"] !== token) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Bad alert token", status: 401 });
    return;
  }
  const alert = req.body as SentryAlert;
  const summary = `🚨 [${alert.level?.toUpperCase()}] ${alert.project}: ${alert.message}`;
  logger.warn({ alert }, "alert received");
  await forwardToSlack(alert, summary);
  res.json({ ok: true });
});

/**
 * POST /api/alerts/test
 * Manually trigger an alert (for testing webhook configuration).
 */
router.post("/test", async (req, res) => {
  const summary = `🧪 Test alert from Aether Energy at ${new Date().toISOString()}`;
  await forwardToSlack(req.body || {}, summary);
  res.json({ ok: true, forwarded: !!process.env.ALERT_WEBHOOK_URL });
});

/**
 * POST /api/alerts/discord
 * Test the Discord webhook for trade fill notifications.
 * In production, the notify() service calls this directly.
 */
router.post("/discord", async (req, res) => {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    res.status(503).json({ code: "NOT_CONFIGURED", message: "Set DISCORD_WEBHOOK_URL env var to enable", status: 503 });
    return;
  }
  const { title, description, color, fields } = req.body as {
    title: string;
    description: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  };
  const embed = {
    title: title || "Aether Energy",
    description: description || "Test notification",
    color: color ?? 0x10b981,
    timestamp: new Date().toISOString(),
    fields: fields || [],
    footer: { text: "Aether Energy · aether-energy.ai" },
  };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ code: "DISCORD_ERROR", message: err.slice(0, 200) });
    }
    res.json({ ok: true, message: "Discord webhook delivered" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: (err as Error).message });
  }
});

/**
 * GET /api/alerts/config
 * Show which webhooks are configured (for diagnostics).
 */
router.get("/config", (_req, res) => {
  res.json({
    alertWebhook: !!process.env.ALERT_WEBHOOK_URL,
    discordWebhook: !!process.env.DISCORD_WEBHOOK_URL,
    sentryToken: !!process.env.ALERT_WEBHOOK_TOKEN,
  });
});

export default router;
