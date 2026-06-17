/**
 * API key authentication — for programmatic access.
 * Authorization: Bearer aether_live_<prefix>_<secret>
 *
 * On valid key: sets req.user = { userId, scopes }
 * Usage: app.get("/api/v1/...", apiKeyAuth("read:portfolio"), handler)
 */
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { logger } from "../lib/logger";

interface AuthedUser {
  userId: string;
  scopes: string[];
  apiKeyId: string;
}

declare global {
  namespace Express {
    interface Request {
      apiUser?: AuthedUser;
    }
  }
}

export function apiKeyAuth(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer aether_live_")) {
        res.status(401).json({ code: "UNAUTHORIZED", message: "API key required (Bearer aether_live_<key>)", status: 401 });
        return;
      }
      const token = auth.slice("Bearer aether_live_".length);
      const parts = token.split("_");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        res.status(401).json({ code: "INVALID_KEY", message: "Malformed API key", status: 401 });
        return;
      }
      const [prefix, secret] = parts;

      const keys = await db.select().from(schema.apiKeys)
        .where(and(
          eq(schema.apiKeys.prefix, prefix),
          isNull(schema.apiKeys.revokedAt)
        ))
        .execute();

      if (keys.length === 0) {
        res.status(401).json({ code: "INVALID_KEY", message: "Invalid API key", status: 401 });
        return;
      }

      // Verify against each matching prefix (usually just one)
      let matched: typeof keys[0] | null = null;
      for (const k of keys) {
        if (k.expiresAt && k.expiresAt < new Date()) continue;
        const ok = await bcrypt.compare(secret, k.hash);
        if (ok) { matched = k; break; }
      }

      if (!matched) {
        res.status(401).json({ code: "INVALID_KEY", message: "Invalid API key", status: 401 });
        return;
      }

      // Check scope
      if (requiredScope && !matched.scopes.includes(requiredScope)) {
        res.status(403).json({
          code: "INSUFFICIENT_SCOPE",
          message: `API key missing required scope: ${requiredScope}`,
          required: requiredScope,
          granted: matched.scopes,
          status: 403,
        });
        return;
      }

      // Update lastUsedAt (fire and forget)
      db.update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, matched.id))
        .execute()
        .catch((err) => logger.warn({ err: err.message }, "api key lastUsed update failed"));

      req.apiUser = {
        userId: matched.userId,
        scopes: matched.scopes,
        apiKeyId: matched.id,
      };
      req.user = { userId: matched.userId, role: "user" } as any;
      next();
    } catch (err) {
      logger.error({ err: (err as Error).message }, "api key auth failed");
      res.status(500).json({ code: "INTERNAL", message: "Authentication failed" });
    }
  };
}