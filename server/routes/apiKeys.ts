/**
 * Per-user API keys — programmatic access for third-party developers.
 * Tokens are bcrypt-hashed; only prefix is shown in UI.
 * Auth: Authorization: Bearer aether_live_<prefix>_<secret>
 *
 * GET    /api/keys            list user's keys (no secrets)
 * POST   /api/keys            create key (returns secret ONCE)
 * DELETE /api/keys/:id        revoke key
 * POST   /api/keys/:id/rotate rotate key (issues new secret)
 */
import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(50),
  scopes: z.array(z.enum(["read:portfolio", "read:market", "trade:paper", "read:backtests", "read:strategies"])).min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

function generateKey(): { prefix: string; secret: string; full: string } {
  const prefix = crypto.randomBytes(4).toString("hex"); // 8 chars
  const secret = crypto.randomBytes(32).toString("hex"); // 64 chars
  return { prefix, secret, full: `aether_live_${prefix}_${secret}` };
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const keys = await db.select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      prefix: schema.apiKeys.prefix,
      scopes: schema.apiKeys.scopes,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      expiresAt: schema.apiKeys.expiresAt,
      revokedAt: schema.apiKeys.revokedAt,
      createdAt: schema.apiKeys.createdAt,
    })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, req.user!.userId))
      .orderBy(desc(schema.apiKeys.createdAt))
      .execute();
    res.json({ keys, total: keys.length });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load keys" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message });
    return;
  }
  try {
    // Cap at 10 active keys per user
    const existing = await db.select({ id: schema.apiKeys.id })
      .from(schema.apiKeys)
      .where(and(
        eq(schema.apiKeys.userId, req.user!.userId),
        isNull(schema.apiKeys.revokedAt)
      ))
      .execute();
    if (existing.length >= 10) {
      res.status(400).json({ code: "LIMIT", message: "Maximum 10 active keys per user. Revoke one first." });
      return;
    }

    const { prefix, secret, full } = generateKey();
    const hash = await bcrypt.hash(secret, 10);
    const id = nanoid();
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 86400000)
      : null;

    await db.insert(schema.apiKeys).values({
      id,
      userId: req.user!.userId,
      name: parsed.data.name,
      prefix,
      hash,
      scopes: parsed.data.scopes,
      expiresAt,
    }).execute();

    // Return full key ONCE — never shown again
    res.json({
      id,
      key: full,
      prefix,
      scopes: parsed.data.scopes,
      expiresAt,
      warning: "Save this key now. It will not be shown again.",
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "key create failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to create key" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await db.update(schema.apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.apiKeys.id, req.params.id), eq(schema.apiKeys.userId, req.user!.userId)))
      .execute();
    if (result.rowCount === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Key not found" });
      return;
    }
    res.json({ message: "Key revoked" });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to revoke key" });
  }
});

router.post("/:id/rotate", authMiddleware, async (req, res) => {
  try {
    const { prefix, secret, full } = generateKey();
    const hash = await bcrypt.hash(secret, 10);
    const result = await db.update(schema.apiKeys)
      .set({ prefix, hash, revokedAt: null, expiresAt: null, lastUsedAt: null })
      .where(and(eq(schema.apiKeys.id, req.params.id), eq(schema.apiKeys.userId, req.user!.userId)))
      .execute();
    if (result.rowCount === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Key not found" });
      return;
    }
    res.json({
      key: full,
      prefix,
      warning: "New key issued. Save it now — secret is shown only once.",
    });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to rotate key" });
  }
});

export default router;