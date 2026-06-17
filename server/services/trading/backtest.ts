/**
 * Backtest engine — runs trading strategies against historical data.
 *
 * Supported strategies:
 *   - "Mean Reversion" — buy when price drops X% from N-day high, sell after M days
 *   - "Momentum"       — buy when price rises X% from N-day low, sell on stop-loss
 *   - "Buy & Hold"     — baseline
 *
 * Data source: Yahoo Finance (free, 15min delayed). Falls back to synthetic data.
 *
 * Metrics:
 *   - Total return, return %
 *   - Sharpe ratio (annualized)
 *   - Max drawdown, drawdown %
 *   - Win rate
 *   - Total trades
 */
import { nanoid } from "nanoid";
import { db, schema } from "../../db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestInput {
  strategy: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  params?: {
    lookback?: number;
    threshold?: number;
    holdDays?: number;
    stopLossPct?: number;
    takeProfitPct?: number;
  };
}

interface Trade {
  id: string;
  side: "buy" | "sell";
  symbol: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryTime: number;
  exitTime?: number;
  pnl?: number;
  pnlPct?: number;
  reason: string;
}

interface BacktestResult {
  initialBalance: number;
  finalEquity: number;
  totalReturn: number;
  totalReturnPct: number;
  trades: Trade[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    winRate: number;
    totalTrades: number;
    avgProfit: number;
    avgProfitPct: number;
    buyAndHoldReturn: number;
  };
}

const TIMEOUT_MS = 12_000;
const SLIPPAGE_BPS = 5;

async function fetchYahooHistory(symbol: string, startDate: string, endDate: string): Promise<Candle[]> {
  const symbolMap: Record<string, string> = {
    WTI: "CL=F", BRENT: "BZ=F", NGAS: "NG=F", GOLD: "GC=F",
    SILVER: "SI=F", COPPER: "HG=F", HEATOIL: "HO=F", GASOL: "RB=F",
  };
  const yahooSymbol = symbolMap[symbol.toUpperCase()] || symbol;
  const period1 = Math.floor(new Date(startDate).getTime() / 1000);
  const period2 = Math.floor(new Date(endDate).getTime() / 1000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`,
      { signal: ctrl.signal, headers: { "User-Agent": "AetherEnergy/1.0" } },
    );
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
    return candles;
  } finally {
    clearTimeout(t);
  }
}

function generateSyntheticCandles(symbol: string, startDate: string, endDate: string): Candle[] {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  let rng = seed;
  const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
  const basePrices: Record<string, number> = {
    WTI: 75, BRENT: 79, NGAS: 3.2, GOLD: 4350, SILVER: 70, COPPER: 6.5, HEATOIL: 3.1, GASOL: 2.8,
  };
  const base = basePrices[symbol.toUpperCase()] || 100;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const candles: Candle[] = [];
  let price = base;
  for (let t = start; t <= end; t += dayMs) {
    const drift = 0.0002;
    const vol = 0.015;
    const ret = drift + vol * (rand() - 0.5) * 2;
    const newPrice = price * (1 + ret);
    const range = newPrice * vol * 0.5;
    const high = newPrice + range * rand();
    const low = newPrice - range * rand();
    candles.push({
      timestamp: t,
      open: price,
      high: Math.max(price, high, newPrice),
      low: Math.min(price, low, newPrice),
      close: newPrice,
      volume: Math.floor(1_000_000 + rand() * 5_000_000),
    });
    price = newPrice;
  }
  return candles;
}

function meanReversionSignals(candles: Candle[], params: { lookback: number; threshold: number; holdDays: number }): { timestamp: number; action: "buy" | "sell"; price: number; reason: string }[] {
  const { lookback, threshold, holdDays } = params;
  const signals: { timestamp: number; action: "buy" | "sell"; price: number; reason: string; entryIdx?: number }[] = [];
  let openIdx = -1;
  for (let i = lookback; i < candles.length; i++) {
    const recentHigh = Math.max(...candles.slice(i - lookback, i).map(c => c.high));
    const dropPct = (recentHigh - candles[i].close) / recentHigh;
    if (openIdx === -1 && dropPct >= threshold) {
      signals.push({ timestamp: candles[i].timestamp, action: "buy", price: candles[i].close, reason: `Mean reversion: dropped ${(dropPct * 100).toFixed(2)}% from ${lookback}d high`, entryIdx: i });
      openIdx = i;
    } else if (openIdx !== -1 && i - openIdx >= holdDays) {
      signals.push({ timestamp: candles[i].timestamp, action: "sell", price: candles[i].close, reason: `Hold period ${holdDays}d reached` });
      openIdx = -1;
    }
  }
  if (openIdx !== -1) {
    const last = candles[candles.length - 1];
    signals.push({ timestamp: last.timestamp, action: "sell", price: last.close, reason: "End of backtest" });
  }
  return signals;
}

function momentumSignals(candles: Candle[], params: { lookback: number; threshold: number; stopLossPct: number; takeProfitPct: number }): { timestamp: number; action: "buy" | "sell"; price: number; reason: string }[] {
  const { lookback, threshold, stopLossPct, takeProfitPct } = params;
  const signals: { timestamp: number; action: "buy" | "sell"; price: number; reason: string; entryIdx?: number; entryPrice?: number }[] = [];
  let openIdx = -1;
  let entryPrice = 0;
  for (let i = lookback; i < candles.length; i++) {
    const recentLow = Math.min(...candles.slice(i - lookback, i).map(c => c.low));
    const risePct = (candles[i].close - recentLow) / recentLow;
    if (openIdx === -1 && risePct >= threshold) {
      signals.push({ timestamp: candles[i].timestamp, action: "buy", price: candles[i].close, reason: `Momentum: rose ${(risePct * 100).toFixed(2)}% from ${lookback}d low`, entryIdx: i, entryPrice: candles[i].close });
      openIdx = i;
      entryPrice = candles[i].close;
    } else if (openIdx !== -1) {
      const pnlPct = (candles[i].close - entryPrice) / entryPrice;
      if (pnlPct <= -stopLossPct) {
        signals.push({ timestamp: candles[i].timestamp, action: "sell", price: candles[i].close, reason: `Stop loss: -${(pnlPct * 100).toFixed(2)}%` });
        openIdx = -1;
      } else if (pnlPct >= takeProfitPct) {
        signals.push({ timestamp: candles[i].timestamp, action: "sell", price: candles[i].close, reason: `Take profit: +${(pnlPct * 100).toFixed(2)}%` });
        openIdx = -1;
      }
    }
  }
  if (openIdx !== -1) {
    const last = candles[candles.length - 1];
    signals.push({ timestamp: last.timestamp, action: "sell", price: last.close, reason: "End of backtest" });
  }
  return signals;
}

function simulate(candles: Candle[], signals: { timestamp: number; action: "buy" | "sell"; price: number; reason: string }[], initialBalance: number): { trades: Trade[]; equityCurve: { timestamp: number; equity: number }[] } {
  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];
  let balance = initialBalance;
  let position: { quantity: number; entryPrice: number; entryTime: number; id: string } | null = null;

  for (const candle of candles) {
    for (const sig of signals.filter(s => s.timestamp === candle.timestamp)) {
      const slippage = sig.action === "buy" ? 1 + SLIPPAGE_BPS / 10000 : 1 - SLIPPAGE_BPS / 10000;
      const execPrice = sig.price * slippage;
      if (sig.action === "buy" && !position) {
        const quantity = Math.floor((balance * 0.95) / execPrice);
        if (quantity > 0) {
          const cost = quantity * execPrice;
          balance -= cost;
          position = { quantity, entryPrice: execPrice, entryTime: candle.timestamp, id: nanoid() };
        }
      } else if (sig.action === "sell" && position) {
        const proceeds = position.quantity * execPrice;
        balance += proceeds;
        const trade: Trade = {
          id: position.id,
          side: "buy",
          symbol: "",
          entryPrice: position.entryPrice,
          exitPrice: execPrice,
          quantity: position.quantity,
          entryTime: position.entryTime,
          exitTime: candle.timestamp,
          pnl: proceeds - (position.quantity * position.entryPrice),
          pnlPct: (execPrice - position.entryPrice) / position.entryPrice,
          reason: sig.reason,
        };
        trades.push(trade);
        position = null;
      }
    }
    const equity = balance + (position ? position.quantity * candle.close : 0);
    equityCurve.push({ timestamp: candle.timestamp, equity });
  }
  return { trades, equityCurve };
}

function computeMetrics(result: { trades: Trade[]; equityCurve: { timestamp: number; equity: number }[] }, initialBalance: number, candles: Candle[]): BacktestResult["metrics"] {
  const finalEquity = result.equityCurve[result.equityCurve.length - 1]?.equity || initialBalance;
  const totalReturn = finalEquity - initialBalance;
  const totalReturnPct = totalReturn / initialBalance;
  const wins = result.trades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = result.trades.length > 0 ? wins / result.trades.length : 0;
  const avgProfit = result.trades.length > 0 ? result.trades.reduce((s, t) => s + (t.pnl || 0), 0) / result.trades.length : 0;
  const avgProfitPct = result.trades.length > 0 ? result.trades.reduce((s, t) => s + (t.pnlPct || 0), 0) / result.trades.length : 0;

  let peak = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  for (const point of result.equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak - point.equity;
    const ddPct = dd / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
  }

  const dailyReturns: number[] = [];
  for (let i = 1; i < result.equityCurve.length; i++) {
    const prev = result.equityCurve[i - 1].equity;
    const cur = result.equityCurve[i].equity;
    dailyReturns.push((cur - prev) / prev);
  }
  const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const std = dailyReturns.length > 0 ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / dailyReturns.length) : 0;
  const sharpeRatio = std > 0 ? (meanReturn / std) * Math.sqrt(252) : 0;

  const buyAndHoldReturn = candles.length > 0 ? (candles[candles.length - 1].close - candles[0].open) / candles[0].open : 0;

  return {
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPct,
    winRate,
    totalTrades: result.trades.length,
    avgProfit,
    avgProfitPct,
    buyAndHoldReturn,
  };
}

export async function runBacktest(userId: string, input: BacktestInput): Promise<{ id: string; result: BacktestResult }> {
  const id = nanoid();
  await db.insert(schema.backtests).values({
    id,
    userId,
    strategy: input.strategy,
    symbol: input.symbol,
    startDate: input.startDate,
    endDate: input.endDate,
    initialBalance: input.initialBalance.toString(),
    status: "running",
    params: JSON.stringify(input.params || {}),
  }).execute();

  try {
    logger.info({ id, userId, strategy: input.strategy, symbol: input.symbol }, "backtest started");
    let candles: Candle[];
    try {
      candles = await fetchYahooHistory(input.symbol, input.startDate, input.endDate);
      if (candles.length < 10) throw new Error("Insufficient data");
    } catch (err) {
      logger.warn({ err: (err as Error).message, symbol: input.symbol }, "Yahoo history failed, using synthetic");
      candles = generateSyntheticCandles(input.symbol, input.startDate, input.endDate);
    }

    let signals: { timestamp: number; action: "buy" | "sell"; price: number; reason: string }[];
    if (input.strategy === "Mean Reversion") {
      signals = meanReversionSignals(candles, {
        lookback: input.params?.lookback || 20,
        threshold: input.params?.threshold || 0.05,
        holdDays: input.params?.holdDays || 5,
      });
    } else if (input.strategy === "Momentum") {
      signals = momentumSignals(candles, {
        lookback: input.params?.lookback || 20,
        threshold: input.params?.threshold || 0.03,
        stopLossPct: input.params?.stopLossPct || 0.05,
        takeProfitPct: input.params?.takeProfitPct || 0.10,
      });
    } else {
      signals = [{ timestamp: candles[0].timestamp, action: "buy", price: candles[0].close, reason: "Buy & hold" }];
      const last = candles[candles.length - 1];
      signals.push({ timestamp: last.timestamp, action: "sell", price: last.close, reason: "End" });
    }

    const { trades, equityCurve } = simulate(candles, signals, input.initialBalance);
    const finalEquity = equityCurve[equityCurve.length - 1]?.equity || input.initialBalance;
    const totalReturn = finalEquity - input.initialBalance;
    const totalReturnPct = totalReturn / input.initialBalance;
    const metrics = computeMetrics({ trades, equityCurve }, input.initialBalance, candles);

    const result: BacktestResult = {
      initialBalance: input.initialBalance,
      finalEquity,
      totalReturn,
      totalReturnPct,
      trades: trades.map(t => ({ ...t, symbol: input.symbol })),
      equityCurve,
      metrics,
    };

    await db.update(schema.backtests)
      .set({
        status: "completed",
        finalEquity: finalEquity.toFixed(2),
        totalReturn: totalReturn.toFixed(8),
        totalReturnPct: totalReturnPct.toFixed(8),
        sharpeRatio: metrics.sharpeRatio.toFixed(8),
        maxDrawdown: metrics.maxDrawdown.toFixed(8),
        maxDrawdownPct: metrics.maxDrawdownPct.toFixed(8),
        winRate: metrics.winRate.toFixed(8),
        totalTrades: metrics.totalTrades,
        result: JSON.stringify(result),
        completedAt: new Date(),
      })
      .where(eq(schema.backtests.id, id))
      .execute();

    logger.info({ id, finalEquity, totalReturn, trades: metrics.totalTrades }, "backtest completed");
    return { id, result };
  } catch (err) {
    logger.error({ err: (err as Error).message, id }, "backtest failed");
    await db.update(schema.backtests)
      .set({ status: "failed", error: (err as Error).message, completedAt: new Date() })
      .where(eq(schema.backtests.id, id))
      .execute();
    throw err;
  }
}

export async function getBacktest(userId: string, id: string) {
  const rows = await db.select().from(schema.backtests)
    .where(eq(schema.backtests.id, id))
    .execute();
  if (rows.length === 0) return null;
  if (rows[0].userId !== userId) return null;
  const row = rows[0];
  return {
    id: row.id,
    strategy: row.strategy,
    symbol: row.symbol,
    startDate: row.startDate,
    endDate: row.endDate,
    initialBalance: Number(row.initialBalance),
    finalEquity: row.finalEquity ? Number(row.finalEquity) : null,
    totalReturn: row.totalReturn ? Number(row.totalReturn) : null,
    totalReturnPct: row.totalReturnPct ? Number(row.totalReturnPct) : null,
    sharpeRatio: row.sharpeRatio ? Number(row.sharpeRatio) : null,
    maxDrawdown: row.maxDrawdown ? Number(row.maxDrawdown) : null,
    maxDrawdownPct: row.maxDrawdownPct ? Number(row.maxDrawdownPct) : null,
    winRate: row.winRate ? Number(row.winRate) : null,
    totalTrades: row.totalTrades,
    status: row.status,
    result: row.result ? JSON.parse(row.result) : null,
    error: row.error,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

export async function listBacktests(userId: string, limit = 20) {
  const rows = await db.select().from(schema.backtests)
    .where(eq(schema.backtests.userId, userId))
    .orderBy(desc(schema.backtests.createdAt))
    .limit(limit)
    .execute();
  return rows.map(row => ({
    id: row.id,
    strategy: row.strategy,
    symbol: row.symbol,
    startDate: row.startDate,
    endDate: row.endDate,
    initialBalance: Number(row.initialBalance),
    finalEquity: row.finalEquity ? Number(row.finalEquity) : null,
    totalReturn: row.totalReturn ? Number(row.totalReturn) : null,
    totalReturnPct: row.totalReturnPct ? Number(row.totalReturnPct) : null,
    totalTrades: row.totalTrades,
    status: row.status,
    createdAt: row.createdAt,
  }));
}
