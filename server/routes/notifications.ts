/**
 * Notification routes — in-app notification history.
 * GET   /api/notifications           - list your notifications
 * GET   /api/notifications/unread-count
 * POST  /api/notifications/:id/read  - mark as read
 * POST  /api/notifications/read-all   - mark all as read
 * DELETE /api/notifications/:id      - delete a notification
 */
import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { db, schema } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, req.user!.userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .execute();
    res.json({
      notifications: rows.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
        read: n.read === "true",
        createdAt: n.createdAt,
      })),
      unreadCount: rows.filter(n => n.read === "false").length,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "list notifications failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to fetch notifications" });
  }
});

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, req.user!.userId),
        eq(schema.notifications.read, "false"),
      ))
      .execute();
    res.json({ count: Number(rows[0]?.count || 0) });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to count" });
  }
});

router.post("/:id/read", authMiddleware, async (req, res) => {
  try {
    await db.update(schema.notifications)
      .set({ read: "true" })
      .where(and(
        eq(schema.notifications.id, req.params.id),
        eq(schema.notifications.userId, req.user!.userId),
      ))
      .execute();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to mark read" });
  }
});

router.post("/read-all", authMiddleware, async (req, res) => {
  try {
    await db.update(schema.notifications)
      .set({ read: "true" })
      .where(and(
        eq(schema.notifications.userId, req.user!.userId),
        eq(schema.notifications.read, "false"),
      ))
      .execute();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to mark all read" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await db.delete(schema.notifications)
      .where(and(
        eq(schema.notifications.id, req.params.id),
        eq(schema.notifications.userId, req.user!.userId),
      ))
      .execute();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to delete" });
  }
});

export default router;
