/**
 * Risk management API routes.
 * GET /api/risk/limits       - get current user's risk limits
 * PUT /api/risk/limits       - update risk limits
 * POST /api/risk/kill-switch - toggle kill switch (with action: enable/disable)
 */
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { getRiskLimits, setRiskLimits, defaultLimits } from "../services/risk/manager";
import { logger } from "../lib/logger";

const router = Router();

const updateSchema = z.object({
  maxPositionSize: z.number().min(0).max(10_000_000).optional(),
  maxDailyLoss: z.number().min(0).max(10_000_000).optional(),
  maxOpenOrders: z.number().int().min(1).max(200).optional(),
  killSwitch: z.boolean().optional(),
});

router.get("/limits", authMiddleware, async (req, res) => {
  const limits = await getRiskLimits(req.user!.userId);
  res.json({ limits, defaults: defaultLimits() });
});

router.put("/limits", authMiddleware, async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid limits", status: 400 });
      return;
    }
    const updated = await setRiskLimits(req.user!.userId, parsed.data);
    logger.info({ userId: req.user!.userId, limits: parsed.data }, "risk limits updated");
    res.json({ message: "Risk limits updated", limits: updated });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "risk limits update failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to update risk limits" });
  }
});

router.post("/kill-switch", authMiddleware, async (req, res) => {
  const { action } = req.body as { action?: "enable" | "disable" };
  if (action !== "enable" && action !== "disable") {
    res.status(400).json({ code: "VALIDATION", message: "action must be 'enable' or 'disable'", status: 400 });
    return;
  }
  const limits = await setRiskLimits(req.user!.userId, { killSwitch: action === "enable" });
  logger.warn({ userId: req.user!.userId, action }, "kill switch toggled");
  res.json({
    message: `Kill switch ${action}d`,
    killSwitch: limits.killSwitch,
  });
});

export default router;
