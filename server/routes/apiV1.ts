/**
 * Public v1 API — for third-party developers.
 * Requires API key with appropriate scope.
 *
 * Scopes:
 *   read:portfolio    GET /api/v1/portfolio
 *   read:market       GET /api/v1/market/quotes
 *   read:backtests    GET /api/v1/backtests
 *   read:strategies   GET /api/v1/strategies
 *   trade:paper       POST /api/v1/orders
 *
 * Auth: Authorization: Bearer aether_live_<prefix>_<secret>
 */
import { Router } from "express";
import { db, schema } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { getQuotes } from "../services/data/quoteCache";
import { getBacktest, listBacktests } from "../services/trading/backtest";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/v1/portfolio — account summary.
 * Scope: read:portfolio
 */
router.get("/portfolio", apiKeyAuth("read:portfolio"), async (req, res) => {
  try {
    const userId = req.apiUser!.userId;
    const positions = await db.select().from(schema.positions).where(eq(schema.positions.userId, userId)).execute();
    const orders = await db.select().from(schema.orders).where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "filled"))).execute();
    const totalPnl = positions.reduce((sum, p) => sum + Number(p.realizedPnl || 0), 0);
    res.json({
      asOf: new Date().toISOString(),
      positions: positions.length,
      openOrders: orders.length,
      realizedPnl: totalPnl,
      apiKeyId: req.apiUser!.apiKeyId,
    });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load portfolio" });
  }
});

/**
 * GET /api/v1/market/quotes — live market data.
 * Scope: read:market
 */
router.get("/market/quotes", apiKeyAuth("read:market"), async (_req, res) => {
  try {
    const quotes = await getQuotes();
    res.json({ quotes: quotes.map(({ ...q }: any) => { delete q._mock; return q; }) });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load quotes" });
  }
});

/**
 * GET /api/v1/backtests — list user's backtests.
 * Scope: read:backtests
 */
router.get("/backtests", apiKeyAuth("read:backtests"), async (req, res) => {
  try {
    const userId = req.apiUser!.userId;
    const list = await db.select().from(schema.backtests)
      .where(eq(schema.backtests.userId, userId))
      .orderBy(desc(schema.backtests.createdAt))
      .limit(50)
      .execute();
    res.json({ backtests: list.map((b) => ({ id: b.id, symbol: b.symbol, strategy: b.strategy, startDate: b.startDate, endDate: b.endDate, createdAt: b.createdAt })) });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load backtests" });
  }
});

/**
 * GET /api/v1/strategies — list marketplace strategies.
 * Scope: read:strategies
 */
router.get("/strategies", apiKeyAuth("read:strategies"), async (_req, res) => {
  try {
    const list = await db.select().from(schema.customStrategies)
      .where(eq(schema.customStrategies.published, "true"))
      .orderBy(desc(schema.customStrategies.rating))
      .limit(50)
      .execute();
    res.json({ strategies: list.map((s) => ({ id: s.id, name: s.name, description: s.description, rating: s.rating, clones: s.clones })) });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load strategies" });
  }
});

/**
 * POST /api/v1/orders — submit paper trade.
 * Scope: trade:paper
 * Body: { symbol, side, quantity, type?, limitPrice? }
 */
router.post("/orders", apiKeyAuth("trade:paper"), async (req, res) => {
  const { symbol, side, quantity, type = "market", limitPrice } = req.body;
  if (!symbol || !side || !quantity) {
    res.status(400).json({ code: "VALIDATION", message: "symbol, side, quantity required" });
    return;
  }
  try {
    const id = require("crypto").randomBytes(8).toString("hex");
    await db.insert(schema.orders).values({
      id,
      userId: req.apiUser!.userId,
      symbol: symbol.toUpperCase(),
      side,
      type,
      quantity: quantity.toString(),
      limitPrice: limitPrice?.toString(),
      status: "pending",
      createdAt: new Date(),
    }).execute();
    res.json({ id, message: "Paper order submitted", status: "pending" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "v1 order submit failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to submit order" });
  }
});

/**
 * GET /api/v1/me — verify API key and get current user info.
 * No scope required — used to validate keys.
 */
router.get("/me", apiKeyAuth(), async (req, res) => {
  try {
    const user = await db.select().from(schema.users)
      .where(eq(schema.users.id, req.apiUser!.userId))
      .limit(1)
      .execute();
    res.json({
      userId: req.apiUser!.userId,
      username: user[0]?.username,
      tier: user[0]?.tier,
      scopes: req.apiUser!.scopes,
      apiKeyId: req.apiUser!.apiKeyId,
    });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to load user" });
  }
});

export default router;