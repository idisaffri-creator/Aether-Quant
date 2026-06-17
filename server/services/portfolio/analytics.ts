/**
 * Portfolio analytics — risk + return metrics over user's trade history.
 *
 * Metrics:
 *   - total return, return %
 *   - Sharpe ratio (annualized)
 *   - max drawdown
 *   - win rate, avg win, avg loss
 *   - profit factor
 *   - best/worst trade
 *   - exposure (current positions market value)
 */
import { db, schema } from "../../db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { getQuotes } from "../data/quoteCache";

export interface PortfolioAnalytics {
  asOf: string;
  paperBalance: number;
  equity: number;
  totalPnl: number;
  totalPnlPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  exposure: number;
  exposurePct: number;
  totalTrades: number;
  metrics: {
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    winRate: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    bestTrade: { symbol: string; pnl: number; date: string } | null;
    worstTrade: { symbol: string; pnl: number; date: string } | null;
  };
  perSymbol: Array<{ symbol: string; pnl: number; trades: number; quantity: number }>;
}

const RISK_FREE_RATE = 0.05; // 5% annual
const TRADING_DAYS = 252;

export async function getPortfolioAnalytics(userId: string): Promise<PortfolioAnalytics> {
  // Get all closed positions (trades with realized P&L)
  const positions = await db.select().from(schema.positions)
    .where(eq(schema.positions.userId, userId))
    .execute();
  const orders = await db.select().from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(1000)
    .execute();

  // Get user balance
  const userRows = await db.select({ preferences: schema.users.preferences })
    .from(schema.users).where(eq(schema.users.id, userId)).execute();
  const prefs = (userRows[0]?.preferences as any) || {};
  const paperBalance = prefs.paperBalance || 100000;

  // Get current quotes for mark-to-market
  const quotes = await getQuotes();
  const quoteMap = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));

  // Calculate unrealized P&L
  let unrealizedPnl = 0;
  let exposure = 0;
  const perSymbol: Record<string, { pnl: number; trades: number; quantity: number }> = {};
  for (const p of positions) {
    const qty = Number(p.quantity);
    const avg = Number(p.avgEntryPrice);
    const symbolUpper = p.symbol.toUpperCase();
    const quote = quoteMap.get(symbolUpper);
    const mark = quote?.price || avg;
    const marketValue = qty * mark;
    const cost = qty * avg;
    const upnl = marketValue - cost;
    unrealizedPnl += upnl;
    exposure += marketValue;
    perSymbol[p.symbol] = perSymbol[p.symbol] || { pnl: 0, trades: 0, quantity: 0 };
    perSymbol[p.symbol].pnl += upnl + Number(p.realizedPnl || 0);
    perSymbol[p.symbol].trades += 1;
    perSymbol[p.symbol].quantity = qty;
  }

  // For realized P&L, approximate from filled orders
  // (A proper implementation would track realized P&L per closed position)
  const realizedPnl = positions.reduce((sum, p) => sum + Number(p.realizedPnl || 0), 0);

  const equity = paperBalance + realizedPnl + unrealizedPnl;
  const totalPnl = equity - paperBalance;
  const totalPnlPct = totalPnl / paperBalance;
  const exposurePct = exposure / equity;

  // Calculate daily returns from order history
  const dailyReturns = calculateDailyReturns(orders, paperBalance);

  // Sharpe ratio
  const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const std = dailyReturns.length > 0 ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / dailyReturns.length) : 0;
  const sharpe = std > 0 ? ((meanReturn - RISK_FREE_RATE / TRADING_DAYS) / std) * Math.sqrt(TRADING_DAYS) : 0;

  // Sortino ratio (downside deviation)
  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downstd = negativeReturns.length > 0 ? Math.sqrt(negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length) : 0;
  const sortino = downstd > 0 ? ((meanReturn - RISK_FREE_RATE / TRADING_DAYS) / downstd) * Math.sqrt(TRADING_DAYS) : 0;

  // Max drawdown
  let peak = paperBalance;
  let maxDD = 0;
  let maxDDPct = 0;
  let runningEquity = paperBalance;
  for (const r of dailyReturns) {
    runningEquity = runningEquity * (1 + r);
    if (runningEquity > peak) peak = runningEquity;
    const dd = peak - runningEquity;
    if (dd > maxDD) maxDD = dd;
    const ddPct = dd / peak;
    if (ddPct > maxDDPct) maxDDPct = ddPct;
  }

  // Trade stats
  const trades: number[] = Object.values(perSymbol).map(s => s.pnl);
  const wins = trades.filter(t => t > 0);
  const losses = trades.filter(t => t < 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (wins.reduce((a, b) => a + b, 0)) / (losses.reduce((a, b) => a + Math.abs(b), 0)) : wins.length > 0 ? Infinity : 0;

  const sortedTrades = Object.entries(perSymbol)
    .map(([symbol, data]) => ({ symbol, pnl: data.pnl, date: new Date().toISOString() }))
    .sort((a, b) => b.pnl - a.pnl);
  const bestTrade = sortedTrades[0] || null;
  const worstTrade = sortedTrades[sortedTrades.length - 1] || null;

  return {
    asOf: new Date().toISOString(),
    paperBalance,
    equity,
    totalPnl,
    totalPnlPct,
    realizedPnl,
    unrealizedPnl,
    exposure,
    exposurePct,
    totalTrades: trades.length,
    metrics: {
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      maxDrawdown: maxDD,
      maxDrawdownPct: maxDDPct,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
    },
    perSymbol: Object.entries(perSymbol).map(([symbol, data]) => ({ symbol, ...data })),
  };
}

function calculateDailyReturns(orders: any[], initialBalance: number): number[] {
  if (orders.length === 0) return [];
  // Group orders by day, sum P&L impact
  const dailyPnl: Record<string, number> = {};
  for (const o of orders) {
    if (o.status !== "filled" || !o.filledAt) continue;
    const day = new Date(o.filledAt).toISOString().split("T")[0];
    if (!dailyPnl[day]) dailyPnl[day] = 0;
    // Approximate: buy = -cost, sell = +proceeds
    const qty = Number(o.filledQty || o.quantity);
    const price = Number(o.avgFillPrice || o.limitPrice || 0);
    const pnl = o.side === "buy" ? -qty * price : qty * price;
    dailyPnl[day] += pnl;
  }
  const sortedDays = Object.keys(dailyPnl).sort();
  let running = initialBalance;
  const returns: number[] = [];
  for (const day of sortedDays) {
    const ret = dailyPnl[day] / running;
    returns.push(ret);
    running += dailyPnl[day];
  }
  return returns;
}
