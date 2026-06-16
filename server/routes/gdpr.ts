import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { audit } from "../services/audit";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/auth/me/export
 * GDPR Art. 20 — Right to data portability.
 * Returns all personal data we hold about the requesting user as a single JSON document.
 */
router.get("/export", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }
    const u = rows[0];

    // Best-effort: gather notifications, signals, strategies, trades
    const [notifications, signals, strategies, trades] = await Promise.allSettled([
      db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).execute(),
      db.select().from(schema.signals).where(eq(schema.signals.userId, userId)).execute(),
      db.select().from(schema.strategies).where(eq(schema.strategies.userId, userId)).execute(),
      db.select().from(schema.trades).where(eq(schema.trades.userId, userId)).execute(),
    ]);

    await audit({ userId, action: "account.export", ip: req.ip, requestId: req.id });

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        gdprArticle: "Art. 20 — Right to data portability",
        requestId: req.id,
      },
      profile: {
        id: u.id,
        email: u.email,
        username: u.username,
        walletAddress: u.walletAddress,
        tier: u.tier,
        role: u.tier === "admin" ? "admin" : "user",
        status: u.status,
        emailVerified: u.emailVerified === "true",
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        preferences: u.preferences,
      },
      notifications: notifications.status === "fulfilled" ? notifications.value : [],
      signals: signals.status === "fulfilled" ? signals.value : [],
      strategies: strategies.status === "fulfilled" ? strategies.value : [],
      trades: trades.status === "fulfilled" ? trades.value : [],
    };
    res.setHeader("Content-Disposition", `attachment; filename="aether-data-export-${userId}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "data export failed");
    res.status(500).json({ code: "INTERNAL", message: "Export failed", status: 500 });
  }
});

/**
 * DELETE /api/auth/me
 * GDPR Art. 17 — Right to erasure ("right to be forgotten").
 * Soft-deletes the account, anonymizes PII, preserves aggregates.
 */
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const tombstoneEmail = `deleted+${userId}@aether-energy.invalid`;
    const tombstoneUsername = `deleted_${userId.slice(0, 8)}`;

    await db
      .update(schema.users)
      .set({
        email: tombstoneEmail,
        username: tombstoneUsername,
        passwordHash: "!deleted!",
        walletAddress: null,
        status: "suspended",
        preferences: {},
        updatedAt: now,
      })
      .where(eq(schema.users.id, userId))
      .execute();

    await audit({ userId, action: "account.delete", ip: req.ip, requestId: req.id });
    res.json({ message: "Account deleted. PII anonymized; analytics aggregates preserved as required by law." });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "account delete failed");
    res.status(500).json({ code: "INTERNAL", message: "Account delete failed", status: 500 });
  }
});

export default router;
