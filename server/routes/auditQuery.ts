import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { queryAudit } from "../services/audit";
import { logger } from "../lib/logger";

const router = Router();

const querySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/**
 * GET /api/audit
 * Users see their own events; admins see all.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid query", status: 400 });
      return;
    }
    const isAdmin = req.user!.role === "admin" || (await isAdminByTier(req.user!.userId));
    const q = parsed.data;

    if (!isAdmin && q.userId && q.userId !== req.user!.userId) {
      res.status(403).json({ code: "FORBIDDEN", message: "Cannot view other users' audit log", status: 403 });
      return;
    }

    const rows = await queryAudit({
      userId: isAdmin ? q.userId : req.user!.userId,
      action: q.action,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
      offset: q.offset,
    });
    res.json({ entries: rows, total: rows.length });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "audit query failed");
    res.status(500).json({ code: "INTERNAL", message: "Audit query failed", status: 500 });
  }
});

async function isAdminByTier(userId: string): Promise<boolean> {
  try {
    const rows = await db.select({ tier: schema.users.tier }).from(schema.users).where(eq(schema.users.id, userId)).execute();
    return rows[0]?.tier === "admin";
  } catch {
    return false;
  }
}

export default router;
