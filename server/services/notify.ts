/**
 * Notification service — wires email + WebSocket + browser push.
 *
 * User preferences control which channels to use:
 *   - notifications.tradeFills: bool
 *   - notifications.priceAlerts: bool
 *   - notifications.signalAlerts: bool
 *   - notifications.kycUpdates: bool
 *   - notifications.securityAlerts: bool
 *
 * Channels:
 *   - email (via email service)
 *   - in-app (via WebSocket user broadcaster)
 *   - browser (Web Push API — TODO)
 */
import { logger } from "../lib/logger";
import { sendEmail, templates, isEmailConfigured } from "./email";
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import { broadcastToUser } from "../../ws/userBroadcaster";

export type NotificationType = "trade_fill" | "kyc_status" | "signal_alert" | "security_alert" | "system";

interface NotifyOptions {
  type: NotificationType;
  title: string;
  body: string;
  emailData?: Parameters<typeof templates.tradeFill>[0] | Parameters<typeof templates.kycStatus>[0] | Parameters<typeof templates.securityAlert>[0];
  meta?: Record<string, unknown>;
}

const PREFS_MAP: Record<NotificationType, string> = {
  trade_fill: "tradeFills",
  kyc_status: "kycUpdates",
  signal_alert: "signalAlerts",
  security_alert: "securityAlerts",
  system: "tradeFills", // fallback
};

export async function notify(userId: string, opts: NotifyOptions): Promise<{ emailSent: boolean; wsSent: boolean }> {
  const result = { emailSent: false, wsSent: false };
  try {
    const rows = await db.select({ preferences: schema.users.preferences, email: schema.users.email })
      .from(schema.users).where(eq(schema.users.id, userId)).execute();
    if (rows.length === 0) return result;
    const user = rows[0];
    const prefs = (user.preferences as any)?.notifications || {};
    const prefKey = PREFS_MAP[opts.type];
    const enabled = prefKey ? prefs[prefKey] !== false : true; // default true

    if (!enabled) return result;

    // In-app via WebSocket
    try {
      broadcastToUser(userId, {
        type: "notification",
        data: { kind: opts.type, title: opts.title, body: opts.body, ts: Date.now(), meta: opts.meta },
        ts: Date.now(),
      });
      result.wsSent = true;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "ws broadcast failed");
    }

    // Email (only for important events)
    if (opts.emailData && isEmailConfigured()) {
      let emailMsg;
      if (opts.type === "trade_fill") {
        emailMsg = templates.tradeFill(opts.emailData as any);
      } else if (opts.type === "kyc_status") {
        emailMsg = templates.kycStatus(opts.emailData as any);
      } else if (opts.type === "security_alert") {
        emailMsg = templates.securityAlert(opts.emailData as any);
      }
      if (emailMsg) {
        emailMsg.to = user.email;
        const r = await sendEmail(emailMsg);
        result.emailSent = r.ok;
      }
    }

    return result;
  } catch (err) {
    logger.error({ err: (err as Error).message, userId, type: opts.type }, "notify failed");
    return result;
  }
}
