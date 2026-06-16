import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis";
import crypto from "crypto";

/**
 * Idempotency middleware for write endpoints (POST/PUT/PATCH/DELETE).
 * Client sends `Idempotency-Key` header (UUID recommended).
 * Within 24h, the same key returns the same response — even on retry after network error.
 * If a different body is sent with the same key, returns 409 (key reuse conflict).
 */
export function idempotency(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key || key.length < 8 || key.length > 200) return next();

  const userId = (req as any).user?.userId || "anon";
  const redisKey = `idem:${userId}:${key}`;
  const bodyHash = crypto.createHash("sha256").update(JSON.stringify(req.body || {})).digest("hex");

  redis
    .get(redisKey)
    .then((existing) => {
      if (!existing) {
        // First time — store the body hash, pass through
        (req as any)._idemKey = redisKey;
        (req as any)._idemBodyHash = bodyHash;
        res.on("finish", () => {
          // Only cache on 2xx (avoid caching errors as success)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            redis
              .set(redisKey, JSON.stringify({ bodyHash, status: res.statusCode }), "EX", 86400)
              .catch(() => {});
          } else {
            redis.del(redisKey).catch(() => {});
          }
        });
        return next();
      }
      // Existing key — verify body hash matches
      const parsed = JSON.parse(existing) as { bodyHash: string; status: number };
      if (parsed.bodyHash !== bodyHash) {
        res.status(409).json({
          code: "IDEMPOTENCY_CONFLICT",
          message: "Idempotency-Key reused with different body",
          status: 409,
        });
        return;
      }
      // Same key + same body — replay
      res.setHeader("Idempotent-Replay", "true");
      res.status(parsed.status).json({ message: "Idempotent replay" });
    })
    .catch(() => next());
}
