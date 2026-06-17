/**
 * Email service — abstraction for transactional emails.
 *
 * Providers (auto-detected by env):
 *   RESEND_API_KEY    - Resend (recommended for new projects)
 *   SENDGRID_API_KEY  - SendGrid
 *   SMTP_URL          - Generic SMTP (nodemailer)
 *
 * If no provider configured, emails are logged to console (development mode).
 *
 * Templates:
 *   - trade_fill     - Sent when an order is filled
 *   - kyc_status     - Sent on KYC status change
 *   - password_reset - Sent on password reset request
 *   - security_alert - Sent on suspicious activity
 */
import { logger } from "../lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

type Provider = "resend" | "sendgrid" | "smtp" | "stub";

function getProvider(): Provider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_URL) return "smtp";
  return "stub";
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "Aether Energy <noreply@aether-energy.ai>";

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; provider: Provider; messageId?: string; error?: string }> {
  const provider = getProvider();
  const from = msg.from || FROM_ADDRESS;
  if (provider === "stub") {
    logger.info({ to: msg.to, subject: msg.subject, provider: "stub" }, "email (stub mode — not sent)");
    return { ok: true, provider: "stub" };
  }
  try {
    if (provider === "resend") {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html || msg.text }),
      });
      if (!r.ok) {
        const err = await r.text();
        return { ok: false, provider, error: err.slice(0, 200) };
      }
      const j = await r.json();
      return { ok: true, provider, messageId: j.id };
    }
    if (provider === "sendgrid") {
      const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: from.match(/<(.+)>/)?.[1] || from },
          subject: msg.subject,
          content: [
            { type: "text/plain", value: msg.text },
            ...(msg.html ? [{ type: "text/html", value: msg.html }] : []),
          ],
        }),
      });
      if (!r.ok) {
        return { ok: false, provider, error: `SendGrid ${r.status}` };
      }
      return { ok: true, provider, messageId: r.headers.get("x-message-id") || undefined };
    }
    if (provider === "smtp") {
      // nodemailer lazy import to avoid ESM/CJS issues
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport(process.env.SMTP_URL!);
      const info = await transporter.sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
      return { ok: true, provider, messageId: info.messageId };
    }
    return { ok: false, provider, error: "unknown provider" };
  } catch (err) {
    logger.error({ err: (err as Error).message, provider, to: msg.to }, "email send failed");
    return { ok: false, provider, error: (err as Error).message };
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────

export const templates = {
  tradeFill: (data: { symbol: string; side: string; quantity: number; price: number; orderType: string }): EmailMessage => ({
    to: "",
    subject: `Order filled: ${data.side.toUpperCase()} ${data.quantity} ${data.symbol} @ $${data.price.toFixed(2)}`,
    text: `Your ${data.orderType} order to ${data.side} ${data.quantity} ${data.symbol} has been filled at $${data.price.toFixed(2)}.\n\nView details: https://aether-energy.ai/dashboard/trading`,
  }),

  kycStatus: (data: { status: string; reason?: string }): EmailMessage => ({
    to: "",
    subject: `KYC ${data.status === "approved" ? "approved ✓" : "needs attention"}`,
    text: data.status === "approved"
      ? "Your identity verification has been approved. You can now switch to live trading.\n\nVisit: https://aether-energy.ai/dashboard/settings"
      : `Your KYC submission needs attention: ${data.reason || "Please review and resubmit."}\n\nVisit: https://aether-energy.ai/dashboard/kyc`,
  }),

  passwordReset: (data: { resetUrl: string }): EmailMessage => ({
    to: "",
    subject: "Reset your Aether Energy password",
    text: `Click the link below to reset your password. The link expires in 1 hour.\n\n${data.resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  }),

  securityAlert: (data: { event: string; ip: string; location?: string }): EmailMessage => ({
    to: "",
    subject: "Security alert: new activity on your account",
    text: `${data.event}\n\nIP: ${data.ip}${data.location ? `\nLocation: ${data.location}` : ""}\n\nIf this wasn't you, change your password immediately: https://aether-energy.ai/dashboard/settings`,
  }),
};

export function isEmailConfigured(): boolean {
  return getProvider() !== "stub";
}
