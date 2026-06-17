/**
 * Custom strategy executor — evaluates user-defined conditions and submits orders.
 *
 * Runs on every quote tick. For each enabled custom strategy:
 *   1. Fetch recent price history (cached in Redis)
 *   2. Evaluate conditions (RSI, price change, volume spike, MA cross, MACD)
 *   3. If all conditions met, execute actions (submit paper orders)
 *   4. Track via strategy_runs table
 *
 * Throttled per-strategy: each strategy only evaluates once per N minutes
 * to avoid spamming orders.
 */
import { db, schema } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { logger } from "../../lib/logger";
import { getQuotes } from "../data/quoteCache";
import { routeOrder } from "./router";
import { redis } from "../../lib/redis";

const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes per strategy
const HISTORY_DAYS = 60;
const CACHE_TTL = 6 * 60 * 60; // 6 hours

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CustomCondition {
  indicator: "rsi" | "macd" | "price_change" | "volume_spike" | "moving_average_cross";
  threshold: number;
  comparison: "gt" | "lt";
  lookback?: number;
}

interface CustomAction {
  type: "buy" | "sell";
  quantity: number;
  orderType: "market" | "limit";
  limitOffsetPct?: number;
}

async function fetchCachedHistory(symbol: string): Promise<Candle[]> {
  const cacheKey = `history:${symbol}:${HISTORY_DAYS}d`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as Candle[];
  } catch {
    // continue without cache
  }
  const end = new Date();
  const start = new Date(end.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const symbolMap: Record<string, string> = {
    WTI: "CL=F", BRENT: "BZ=F", NGAS: "NG=F", GOLD: "GC=F",
    SILVER: "SI=F", COPPER: "HG=F", HEATOIL: "HO=F", GASOL: "RB=F",
  };
  const yahooSymbol = symbolMap[symbol.toUpperCase()] || symbol;
  try {
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`,
      { signal: ctrl.signal, headers: { "User-Agent": "AetherEnergy/1.0" } },
    );
    clearTimeout(t);
    if (!r.ok) throw new Error(`Yahoo ${r.status}`);
    const data = await r.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error("No result");
    const ts: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const open = q.open?.[i];
      const high = q.high?.[i];
      const low = q.low?.[i];
      const close = q.close?.[i];
      const volume = q.volume?.[i] || 0;
      if (open == null || high == null || low == null || close == null) continue;
      candles.push({ timestamp: ts[i] * 1000, open, high, low, close, volume });
    }
    if (candles.length >= 20) {
      try {
        await redis.set(cacheKey, JSON.stringify(candles), "EX", CACHE_TTL);
      } catch {
        // ignore cache write errors
      }
    }
    return candles;
  } catch (err) {
    logger.warn({ symbol, err: (err as Error).message }, "custom strategy: history fetch failed");
    return [];
  }
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

async function evaluateConditions(symbol: string, conditions: CustomCondition[]): Promise<{ met: boolean; details: Record<string, unknown> }> {
  const candles = await fetchCachedHistory(symbol);
  if (candles.length < 30) return { met: false, details: { reason: "insufficient_data", candles: candles.length } };
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const details: Record<string, unknown> = {};

  for (const cond of conditions) {
    if (cond.indicator === "rsi") {
      const period = cond.lookback || 14;
      const rsi = calculateRSI(closes, period);
      details[`rsi_${period}`] = rsi.toFixed(2);
      const trigger = cond.comparison === "lt" ? rsi < cond.threshold : rsi > cond.threshold;
      if (!trigger) return { met: false, details: { ...details, reason: `rsi_${cond.comparison}_${cond.threshold}` } };
    } else if (cond.indicator === "price_change") {
      const lookback = cond.lookback || 20;
      const start = closes[closes.length - 1 - lookback];
      const end = closes[closes.length - 1];
      const change = (end - start) / start;
      details[`change_${lookback}d`] = (change * 100).toFixed(2) + "%";
      const trigger = cond.comparison === "lt" ? change < cond.threshold : change > cond.threshold;
      if (!trigger) return { met: false, details: { ...details, reason: `change_${cond.comparison}_${cond.threshold}` } };
    } else if (cond.indicator === "volume_spike") {
      const period = cond.lookback || 20;
      const slice = volumes.slice(-period - 1, -1);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      const current = volumes[volumes.length - 1];
      const ratio = current / avg;
      details[`vol_ratio_${period}`] = ratio.toFixed(2);
      const trigger = cond.comparison === "lt" ? ratio < cond.threshold : ratio > cond.threshold;
      if (!trigger) return { met: false, details: { ...details, reason: `vol_${cond.comparison}_${cond.threshold}` } };
    } else if (cond.indicator === "moving_average_cross") {
      const fastPeriod = Math.max(2, Math.floor((cond.lookback || 20) / 4));
      const slowPeriod = cond.lookback || 20;
      const fastNow = calculateEMA(closes, fastPeriod);
      const slowNow = calculateEMA(closes, slowPeriod);
      const fastPrev = calculateEMA(closes.slice(0, -1), fastPeriod);
      const slowPrev = calculateEMA(closes.slice(0, -1), slowPeriod);
      const cross = (fastNow - slowNow) * (fastPrev - slowPrev) < 0;
      const golden = fastNow > slowNow;
      details.ma_cross = { fast: fastNow.toFixed(2), slow: slowNow.toFixed(2), cross, golden };
      const wantGolden = cond.threshold > 0;
      if (cond.comparison === "gt") {
        if (!cross) return { met: false, details: { ...details, reason: "no_ma_cross" } };
        if (golden !== wantGolden) return { met: false, details: { ...details, reason: "wrong_cross_direction" } };
      }
    } else if (cond.indicator === "macd") {
      const fast = 12;
      const slow = 26;
      const signal = 9;
      const macdLine = calculateEMA(closes, fast) - calculateEMA(closes, slow);
      const macdSeries: number[] = [];
      for (let i = slow; i < closes.length; i++) {
        macdSeries.push(calculateEMA(closes.slice(0, i + 1), fast) - calculateEMA(closes.slice(0, i + 1), slow));
      }
      const signalLine = calculateEMA(macdSeries, signal);
      const histogram = macdLine - signalLine;
      details.macd = { macd: macdLine.toFixed(4), signal: signalLine.toFixed(4), histogram: histogram.toFixed(4) };
      const trigger = cond.comparison === "lt" ? histogram < cond.threshold : histogram > cond.threshold;
      if (!trigger) return { met: false, details: { ...details, reason: `macd_hist_${cond.comparison}_${cond.threshold}` } };
    }
  }
  return { met: true, details };
}

/**
 * Process all enabled custom strategies on each tick.
 * Called from ingest on every quote update.
 */
export async function processCustomStrategies(): Promise<{ evaluated: number; triggered: number; ordersPlaced: number }> {
  let evaluated = 0;
  let triggered = 0;
  let ordersPlaced = 0;
  try {
    const strategies = await db.select().from(schema.customStrategies)
      .where(eq(schema.customStrategies.enabled, "true"))
      .execute();
    for (const strategy of strategies) {
      evaluated++;
      try {
        const throttleKey = `custom_strategy:${strategy.id}:last_run`;
        const lastRun = await redis.get(throttleKey);
        if (lastRun && Date.now() - Number(lastRun) < THROTTLE_MS) {
          continue; // throttled
        }
        const conditions = JSON.parse(strategy.conditions) as CustomCondition[];
        const actions = JSON.parse(strategy.actions) as CustomAction[];
        const { met, details } = await evaluateConditions(strategy.symbol, conditions);
        if (!met) continue;
        triggered++;
        await redis.set(throttleKey, Date.now().toString(), "EX", Math.ceil(THROTTLE_MS / 1000));
        for (const action of actions) {
          let limitPrice: number | undefined;
          if (action.orderType === "limit" && action.limitOffsetPct) {
            const quotes = await getQuotes();
            const quote = quotes.find(q => q.symbol === strategy.symbol);
            if (quote) {
              limitPrice = quote.price * (1 + action.limitOffsetPct);
            }
          }
          const result = await routeOrder(strategy.userId, {
            symbol: strategy.symbol,
            side: action.type,
            type: action.orderType,
            quantity: action.quantity,
            limitPrice,
            strategyId: strategy.id,
          });
          if (result.order) {
            ordersPlaced++;
            logger.info({
              strategyId: strategy.id,
              userId: strategy.userId,
              orderId: result.order.id,
              details,
            }, "custom strategy order placed");
          } else {
            logger.warn({ strategyId: strategy.id, message: result.message }, "custom strategy order rejected");
          }
        }
        // Track run
        await db.insert(schema.strategyRuns).values({
          id: nanoid(),
          strategyId: strategy.id,
          userId: strategy.userId,
          status: "running",
        }).execute();
      } catch (err) {
        logger.error({ err: (err as Error).message, strategyId: strategy.id }, "custom strategy failed");
      }
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, "processCustomStrategies failed");
  }
  return { evaluated, triggered, ordersPlaced };
}
