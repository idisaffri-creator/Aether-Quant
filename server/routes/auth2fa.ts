import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import otplib from "otplib";
import QRCode from "qrcode";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { audit } from "../services/audit";

const { authenticator } = otplib;
const router = Router();

authenticator.options = { window: 1, step: 30 };

const verifySchema = z.object({ token: z.string().regex(/^\d{6}$/) });
const disableSchema = z.object({ password: z.string().min(1) });

function genBackupCodes(n = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    codes.push(
      Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 6)
    );
  }
  return codes;
}

function isDemoUser(id: string, email: string): boolean {
  return id === "demo-user-id" || id === "admin-user-id" || email === "demo@aether-energy.ai" || email === "admin@aether-energy.ai";
}

/**
 * POST /api/auth/2fa/setup
 * Generates a TOTP secret + otpauth URL + QR code (base64 PNG).
 * 2FA is not yet enabled — user must call /2fa/verify with a valid code.
 */
router.post("/setup", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const email = req.user!.email;
    if (isDemoUser(userId, email)) {
      res.status(403).json({ code: "DEMO_READONLY", message: "Demo accounts cannot enable 2FA", status: 403 });
      return;
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, "Aether Energy", secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Stash secret in preferences.twoFactor.pendingSecret until verified
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }
    const prefs = (rows[0].preferences as Record<string, any>) || {};
    prefs.twoFactor = { ...(prefs.twoFactor || {}), pendingSecret: secret };
    await db.update(schema.users).set({ preferences: prefs, updatedAt: new Date() }).where(eq(schema.users.id, userId)).execute();

    res.json({
      message: "Scan the QR code with your authenticator app, then verify with /2fa/verify",
      otpauth,
      qrDataUrl,
      secret, // for manual entry
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "2FA setup failed");
    res.status(500).json({ code: "INTERNAL", message: "2FA setup failed", status: 500 });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Confirms a TOTP code; on success, enables 2FA and returns backup codes.
 */
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "Invalid token format", status: 400 });
      return;
    }
    const userId = req.user!.userId;
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }
    const prefs = (rows[0].preferences as Record<string, any>) || {};
    const pendingSecret = prefs.twoFactor?.pendingSecret;
    if (!pendingSecret) {
      res.status(400).json({ code: "NO_PENDING_SETUP", message: "Call /2fa/setup first", status: 400 });
      return;
    }
    const ok = authenticator.verify({ token: parsed.data.token, secret: pendingSecret });
    if (!ok) {
      res.status(400).json({ code: "INVALID_CODE", message: "TOTP code invalid or expired", status: 400 });
      return;
    }
    const backupCodes = genBackupCodes(10);
    prefs.twoFactor = {
      enabled: true,
      secret: pendingSecret,
      backupCodes,
      enabledAt: new Date().toISOString(),
    };
    delete prefs.twoFactor.pendingSecret;
    await db.update(schema.users).set({ preferences: prefs, updatedAt: new Date() }).where(eq(schema.users.id, userId)).execute();
    await audit({ userId, action: "auth.2fa_enabled", ip: req.ip, requestId: req.id });

    res.json({ message: "2FA enabled", backupCodes });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "2FA verify failed");
    res.status(500).json({ code: "INTERNAL", message: "2FA verify failed", status: 500 });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disables 2FA. Requires current password.
 */
router.post("/disable", authMiddleware, async (req, res) => {
  try {
    const parsed = disableSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "Password required", status: 400 });
      return;
    }
    const userId = req.user!.userId;
    const bcrypt = (await import("bcryptjs")).default;
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }
    const valid = await bcrypt.default.compare(parsed.data.password, rows[0].passwordHash);
    if (!valid) {
      res.status(401).json({ code: "WRONG_PASSWORD", message: "Password incorrect", status: 401 });
      return;
    }
    const prefs = (rows[0].preferences as Record<string, any>) || {};
    if (prefs.twoFactor) delete prefs.twoFactor;
    await db.update(schema.users).set({ preferences: prefs, updatedAt: new Date() }).where(eq(schema.users.id, userId)).execute();
    await audit({ userId, action: "auth.2fa_disabled", ip: req.ip, requestId: req.id });
    res.json({ message: "2FA disabled" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "2FA disable failed", status: 500 });
  }
});

/**
 * GET /api/auth/2fa/status
 * Returns whether 2FA is enabled + remaining backup code count.
 */
router.get("/status", authMiddleware, async (req, res) => {
  const rows = await db.select({ preferences: schema.users.preferences }).from(schema.users).where(eq(schema.users.id, req.user!.userId)).execute();
  if (rows.length === 0) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  const tf = ((rows[0].preferences as Record<string, any>) || {}).twoFactor;
  res.json({
    enabled: !!tf?.enabled,
    enabledAt: tf?.enabledAt || null,
    backupCodesRemaining: tf?.backupCodes?.length || 0,
  });
});

export default router;
