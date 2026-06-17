/**
 * Portfolio API routes.
 * GET /api/portfolio/analytics - full risk + return metrics
 * GET /api/portfolio/positions - current positions with mark-to-market
 */
import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getPortfolioAnalytics } from "../services/portfolio/analytics";

const router = Router();

router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const analytics = await getPortfolioAnalytics(req.user!.userId);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to compute analytics" });
  }
});

export default router;
