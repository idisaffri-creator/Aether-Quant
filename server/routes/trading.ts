import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { submitOrder, cancelOrder, listOrders, getPositions, getPnl, orderSchema } from "../services/trading/paperEngine";
import { startStrategyRun, stopStrategyRun, listStrategyRuns } from "../services/trading/strategyRunner";
import { logger } from "../lib/logger";

const router = Router();

const idSchema = z.object({ id: z.string().min(1) });

/**
 * POST /api/trading/orders
 * Submit a paper order. Supports market, limit, stop.
 */
router.post("/orders", authMiddleware, async (req, res) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid order", status: 400 });
      return;
    }
    const { order, reason } = await submitOrder(req.user!.userId, parsed.data);
    if (!order) {
      res.status(400).json({ code: "REJECTED", message: reason || "Order rejected", status: 400 });
      return;
    }
    res.status(201).json({ order });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "order submit failed");
    res.status(500).json({ code: "INTERNAL", message: "Order submission failed", status: 500 });
  }
});

/**
 * GET /api/trading/orders
 * List your orders (filter by status, symbol).
 */
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const query = z.object({
      status: z.enum(["pending", "filled", "cancelled", "rejected", "partial"]).optional(),
      symbol: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ code: "VALIDATION", message: query.error.issues[0]?.message || "Invalid query", status: 400 });
      return;
    }
    const orders = await listOrders(req.user!.userId, query.data);
    res.json({ orders, total: orders.length });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "list orders failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to list orders", status: 500 });
  }
});

/**
 * DELETE /api/trading/orders/:id
 * Cancel a pending order.
 */
router.delete("/orders/:id", authMiddleware, async (req, res) => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION", message: "Invalid id", status: 400 });
    return;
  }
  const result = await cancelOrder(req.user!.userId, parsed.data.id);
  if (!result.ok) {
    res.status(400).json({ code: "REJECTED", message: result.reason, status: 400 });
    return;
  }
  res.json({ ok: true });
});

/**
 * GET /api/trading/positions
 * List your open positions.
 */
router.get("/positions", authMiddleware, async (req, res) => {
  try {
    const positions = await getPositions(req.user!.userId);
    res.json({ positions });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "get positions failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to load positions", status: 500 });
  }
});

/**
 * GET /api/trading/pnl
 * P&L summary: paper balance, equity, unrealized, realized, position count.
 */
router.get("/pnl", authMiddleware, async (req, res) => {
  try {
    const pnl = await getPnl(req.user!.userId);
    res.json(pnl);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "get pnl failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to load P&L", status: 500 });
  }
});

/**
 * POST /api/trading/strategies/:id/start
 * Start auto-trading a strategy for the calling user. Strategy runs pick up
 * unacknowledged signals from the signals table and submit paper orders.
 */
router.post("/strategies/:id/start", authMiddleware, async (req, res) => {
  try {
    const { runId } = await startStrategyRun(req.user!.userId, req.params.id);
    res.json({ runId, strategyId: req.params.id, status: "running" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "start strategy failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to start strategy", status: 500 });
  }
});

/**
 * POST /api/trading/strategies/:id/stop
 * Stop the user's running instance of this strategy.
 */
router.post("/strategies/:id/stop", authMiddleware, async (req, res) => {
  try {
    const { ok, runId } = await stopStrategyRun(req.user!.userId, req.params.id);
    if (!ok) {
      res.status(404).json({ code: "NOT_FOUND", message: "No running strategy with that id", status: 404 });
      return;
    }
    res.json({ runId, status: "stopped" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "stop strategy failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to stop strategy", status: 500 });
  }
});

/**
 * GET /api/trading/strategies/runs
 * List strategy runs for the calling user.
 */
router.get("/strategies/runs", authMiddleware, async (req, res) => {
  try {
    const runs = await listStrategyRuns(req.user!.userId);
    res.json({ runs });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "list strategy runs failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to list runs", status: 500 });
  }
});

export default router;
