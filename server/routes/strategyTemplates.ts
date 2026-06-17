/**
 * Strategy template library — pre-built strategies users can clone.
 * Stored in code (not DB) since they're versioned with the app.
 */
import { Router } from "express";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middleware/auth";
import { db, schema } from "../db";
import { logger } from "../lib/logger";

const router = Router();

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: "trend" | "mean_reversion" | "volatility" | "momentum" | "volume";
  symbol: string;
  conditions: any[];
  actions: any[];
  backtestHint?: string;
  riskLevel: "low" | "medium" | "high";
  expectedHoldTime: string;
}

export const TEMPLATES: StrategyTemplate[] = [
  {
    id: "rsi-oversold",
    name: "RSI Oversold Buy",
    description: "Buy when 14-period RSI drops below 30. Classic mean reversion signal.",
    category: "mean_reversion",
    symbol: "WTI",
    conditions: [{ indicator: "rsi", threshold: 30, comparison: "lt", lookback: 14 }],
    actions: [{ type: "buy", quantity: 1, orderType: "market" }],
    backtestHint: "Best on range-bound markets. May underperform in strong trends.",
    riskLevel: "medium",
    expectedHoldTime: "5-10 days",
  },
  {
    id: "rsi-overbought-sell",
    name: "RSI Overbought Sell",
    description: "Sell when 14-period RSI rises above 70.",
    category: "mean_reversion",
    symbol: "WTI",
    conditions: [{ indicator: "rsi", threshold: 70, comparison: "gt", lookback: 14 }],
    actions: [{ type: "sell", quantity: 1, orderType: "market" }],
    backtestHint: "Use as exit signal for long positions.",
    riskLevel: "low",
    expectedHoldTime: "Immediate",
  },
  {
    id: "momentum-breakout",
    name: "Momentum Breakout",
    description: "Buy when 20-day price change exceeds 5%.",
    category: "momentum",
    symbol: "GOLD",
    conditions: [{ indicator: "price_change", threshold: 0.05, comparison: "gt", lookback: 20 }],
    actions: [{ type: "buy", quantity: 1, orderType: "market" }],
    backtestHint: "Strong trending markets. May trigger false breakouts in chop.",
    riskLevel: "high",
    expectedHoldTime: "10-20 days",
  },
  {
    id: "volume-spike-buy",
    name: "Volume Spike Buy",
    description: "Buy when volume is 2x the 20-day average. Confirms momentum.",
    category: "volume",
    symbol: "NGAS",
    conditions: [{ indicator: "volume_spike", threshold: 2.0, comparison: "gt", lookback: 20 }],
    actions: [{ type: "buy", quantity: 1, orderType: "market" }],
    backtestHint: "Combines well with momentum or RSI conditions.",
    riskLevel: "medium",
    expectedHoldTime: "3-7 days",
  },
  {
    id: "ma-golden-cross",
    name: "Golden Cross (EMA 5/20)",
    description: "Buy when 5-EMA crosses above 20-EMA.",
    category: "trend",
    symbol: "GOLD",
    conditions: [{ indicator: "moving_average_cross", threshold: 1, comparison: "gt", lookback: 20 }],
    actions: [{ type: "buy", quantity: 1, orderType: "market" }],
    backtestHint: "Classic long-term trend signal. Few signals, high quality.",
    riskLevel: "medium",
    expectedHoldTime: "20-50 days",
  },
  {
    id: "ma-death-cross",
    name: "Death Cross (EMA 5/20)",
    description: "Sell when 5-EMA crosses below 20-EMA.",
    category: "trend",
    symbol: "WTI",
    conditions: [{ indicator: "moving_average_cross", threshold: -1, comparison: "lt", lookback: 20 }],
    actions: [{ type: "sell", quantity: 1, orderType: "market" }],
    backtestHint: "Exit signal for long positions in downtrends.",
    riskLevel: "low",
    expectedHoldTime: "Immediate",
  },
  {
    id: "macd-bullish",
    name: "MACD Bullish Cross",
    description: "Buy when MACD line crosses above signal line (histogram > 0).",
    category: "momentum",
    symbol: "GOLD",
    conditions: [{ indicator: "macd", threshold: 0, comparison: "gt", lookback: 9 }],
    actions: [{ type: "buy", quantity: 1, orderType: "market" }],
    backtestHint: "Combines trend + momentum. Reliable but lagging.",
    riskLevel: "medium",
    expectedHoldTime: "5-15 days",
  },
  {
    id: "multi-rsi-volume",
    name: "Multi-Signal: RSI + Volume",
    description: "Buy when RSI < 35 AND volume is 1.5x average. Higher quality mean reversion.",
    category: "mean_reversion",
    symbol: "WTI",
    conditions: [
      { indicator: "rsi", threshold: 35, comparison: "lt", lookback: 14 },
      { indicator: "volume_spike", threshold: 1.5, comparison: "gt", lookback: 20 },
    ],
    actions: [{ type: "buy", quantity: 1, orderType: "market" }],
    backtestHint: "Fewer signals but higher conviction. Good for choppy markets.",
    riskLevel: "low",
    expectedHoldTime: "5-10 days",
  },
];

router.get("/templates", authMiddleware, (_req, res) => {
  res.json({ templates: TEMPLATES });
});

router.get("/templates/:id", authMiddleware, (req, res) => {
  const t = TEMPLATES.find(x => x.id === req.params.id);
  if (!t) {
    res.status(404).json({ code: "NOT_FOUND", message: "Template not found" });
    return;
  }
  res.json(t);
});

/**
 * POST /api/strategies/templates/:id/clone
 * Clone a template into a user's custom strategies.
 */
router.post("/templates/:id/clone", authMiddleware, async (req, res) => {
  try {
    const t = TEMPLATES.find(x => x.id === req.params.id);
    if (!t) {
      res.status(404).json({ code: "NOT_FOUND", message: "Template not found" });
      return;
    }
    const id = nanoid();
    const symbol = (req.body?.symbol as string) || t.symbol;
    const name = (req.body?.name as string) || t.name;
    await db.insert(schema.customStrategies).values({
      id,
      userId: req.user!.userId,
      name,
      description: t.description,
      symbol,
      conditions: JSON.stringify(t.conditions),
      actions: JSON.stringify(t.actions),
      enabled: "false",
    }).execute();
    logger.info({ userId: req.user!.userId, templateId: t.id, customId: id }, "template cloned");
    res.status(201).json({ id, message: "Template cloned" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "template clone failed");
    res.status(500).json({ code: "INTERNAL", message: "Clone failed" });
  }
});

export default router;
