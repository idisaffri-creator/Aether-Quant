/**
 * Centralized mock data for all dashboard pages.
 * Used as fallback when API calls fail or user is not authenticated.
 * Ensures the dashboard always looks populated and functional.
 */
import type { MarketData, Candle, TradeSignal, OrderBook, OrderBookLevel } from "../../shared/types";

// ─── Market Quotes ──────────────────────────────────────────────────────

export const mockQuotes: MarketData[] = [
  { symbol: "WTI", price: 78.43, change24h: 1.24, volume24h: 482100, high24h: 79.10, low24h: 77.30, bid: 78.40, ask: 78.46, spread: 0.06, timestamp: Date.now() },
  { symbol: "BRENT", price: 82.17, change24h: 0.89, volume24h: 315600, high24h: 82.80, low24h: 81.40, bid: 82.14, ask: 82.20, spread: 0.06, timestamp: Date.now() },
  { symbol: "NGAS", price: 2.14, change24h: -2.31, volume24h: 198700, high24h: 2.21, low24h: 2.10, bid: 2.13, ask: 2.15, spread: 0.02, timestamp: Date.now() },
  { symbol: "GOLD", price: 2034.50, change24h: 0.45, volume24h: 128400, high24h: 2041.20, low24h: 2025.80, bid: 2034.20, ask: 2034.80, spread: 0.60, timestamp: Date.now() },
  { symbol: "SILVER", price: 22.85, change24h: -0.32, volume24h: 87600, high24h: 23.10, low24h: 22.60, bid: 22.83, ask: 22.87, spread: 0.04, timestamp: Date.now() },
  { symbol: "COPPER", price: 3.84, change24h: 0.78, volume24h: 65400, high24h: 3.87, low24h: 3.80, bid: 3.83, ask: 3.85, spread: 0.02, timestamp: Date.now() },
  { symbol: "BTC", price: 67500, change24h: 3.42, volume24h: 28400000000, high24h: 68200, low24h: 65100, bid: 67490, ask: 67510, spread: 20, timestamp: Date.now() },
  { symbol: "ETH", price: 3450, change24h: 2.18, volume24h: 14200000000, high24h: 3510, low24h: 3380, bid: 3448, ask: 3452, spread: 4, timestamp: Date.now() },
  { symbol: "SOL", price: 145, change24h: 5.67, volume24h: 3100000000, high24h: 148, low24h: 137, bid: 144.90, ask: 145.10, spread: 0.20, timestamp: Date.now() },
  { symbol: "HEATOIL", price: 2.51, change24h: 0.56, volume24h: 98200, high24h: 2.54, low24h: 2.48, bid: 2.50, ask: 2.52, spread: 0.02, timestamp: Date.now() },
  { symbol: "GASOL", price: 2.42, change24h: 0.34, volume24h: 76500, high24h: 2.45, low24h: 2.39, bid: 2.41, ask: 2.43, spread: 0.02, timestamp: Date.now() },
  { symbol: "BNB", price: 590, change24h: 1.89, volume24h: 1800000000, high24h: 598, low24h: 578, bid: 589.80, ask: 590.20, spread: 0.40, timestamp: Date.now() },
];

// ─── Candle / Chart Data ────────────────────────────────────────────────

export function mockCandles(symbol: string, count = 50): Candle[] {
  const base = mockQuotes.find((q) => q.symbol === symbol)?.price ?? 78;
  const candles: Candle[] = [];
  let price = base * 0.97;
  for (let i = count; i > 0; i--) {
    const open = price;
    const close = open * (1 + (Math.random() - 0.48) * 0.015);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    candles.push({
      timestamp: Date.now() - i * 3_600_000,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: Math.floor(Math.random() * 50000 + 5000),
    });
    price = close;
  }
  return candles;
}

// ─── Order Book ─────────────────────────────────────────────────────────

export function mockOrderBook(symbol: string): OrderBook {
  const base = mockQuotes.find((q) => q.symbol === symbol)?.price ?? 78;
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  for (let i = 0; i < 15; i++) {
    const bidPrice = base * (1 - (i + 1) * 0.0003);
    const askPrice = base * (1 + (i + 1) * 0.0003);
    const bidSize = Math.round(Math.random() * 500 + 50);
    const askSize = Math.round(Math.random() * 500 + 50);
    bids.push({ price: round2(bidPrice), size: bidSize, total: bidSize * (i + 1) });
    asks.push({ price: round2(askPrice), size: askSize, total: askSize * (i + 1) });
  }
  return { symbol, bids, asks, timestamp: Date.now() };
}

// ─── Trade Signals ──────────────────────────────────────────────────────

export const mockSignals: TradeSignal[] = [
  { id: "sig-1", symbol: "WTI", direction: "long", confidence: 0.82, strategy: "Mean Reversion (oversold)", reason: "RSI at 28, price touched lower Bollinger Band. Historical bounce rate 74%.", timestamp: Date.now() - 300_000, acknowledged: false },
  { id: "sig-2", symbol: "GOLD", direction: "long", confidence: 0.76, strategy: "Momentum Breakout", reason: "Price broke above $2030 resistance with 2x volume. MACD crossover confirmed.", timestamp: Date.now() - 600_000, acknowledged: false },
  { id: "sig-3", symbol: "BTC", direction: "short", confidence: 0.68, strategy: "Overbought Reversal", reason: "RSI at 78, funding rate spike to 0.05%. Extreme greed conditions.", timestamp: Date.now() - 900_000, acknowledged: true },
  { id: "sig-4", symbol: "NGAS", direction: "long", confidence: 0.71, strategy: "Weather-Driven Demand", reason: "HDD forecast rising 15% next week. Storage withdrawal above expectations.", timestamp: Date.now() - 1200_000, acknowledged: false },
  { id: "sig-5", symbol: "SILVER", direction: "short", confidence: 0.64, strategy: "COT Positioning", reason: "Commercials net short at record levels. Historically precedes 8-12% correction.", timestamp: Date.now() - 1500_000, acknowledged: false },
];

// ─── Trading / Positions ────────────────────────────────────────────────

export const mockPositions = [
  { id: "pos-1", symbol: "WTI", side: "long" as const, quantity: 100, avgEntryPrice: 77.20, currentPrice: 78.43, unrealizedPnl: 123.00, openedAt: new Date(Date.now() - 86400_000 * 2).toISOString() },
  { id: "pos-2", symbol: "GOLD", side: "long" as const, quantity: 10, avgEntryPrice: 2020.00, currentPrice: 2034.50, unrealizedPnl: 145.00, openedAt: new Date(Date.now() - 86400_000 * 5).toISOString() },
  { id: "pos-3", symbol: "BTC", side: "short" as const, quantity: 0.5, avgEntryPrice: 68200, currentPrice: 67500, unrealizedPnl: 350.00, openedAt: new Date(Date.now() - 86400_000).toISOString() },
];

export const mockOrders = [
  { id: "ord-1", symbol: "WTI", side: "buy" as const, type: "limit" as const, status: "filled" as const, quantity: 100, price: 77.20, filledQty: 100, filledPrice: 77.20, createdAt: new Date(Date.now() - 86400_000 * 2).toISOString() },
  { id: "ord-2", symbol: "GOLD", side: "buy" as const, type: "market" as const, status: "filled" as const, quantity: 10, price: 2020.00, filledQty: 10, filledPrice: 2020.50, createdAt: new Date(Date.now() - 86400_000 * 5).toISOString() },
  { id: "ord-3", symbol: "BTC", side: "sell" as const, type: "limit" as const, status: "filled" as const, quantity: 0.5, price: 68200, filledQty: 0.5, filledPrice: 68180, createdAt: new Date(Date.now() - 86400_000).toISOString() },
  { id: "ord-4", symbol: "NGAS", side: "buy" as const, type: "limit" as const, status: "pending" as const, quantity: 500, price: 2.08, filledQty: 0, createdAt: new Date().toISOString() },
  { id: "ord-5", symbol: "ETH", side: "sell" as const, type: "stop" as const, status: "pending" as const, quantity: 5, price: 3300, filledQty: 0, createdAt: new Date().toISOString() },
];

export const mockPnl = {
  paperBalance: 100000,
  equity: 101245.50,
  unrealizedPnl: 640.00,
  realizedPnl: 2847.30,
  positions: 3,
  totalTradeCount: 47,
};

// ─── Strategies ─────────────────────────────────────────────────────────

export const mockStrategies = [
  {
    id: "strat-1", name: "WTI Mean Reversion", symbol: "WTI", enabled: true,
    conditions: [{ indicator: "RSI", operator: "lt", value: 30 }, { indicator: "BB", operator: "crosses_below", value: 0 }],
    actions: [{ type: "buy", size: 100 }, { type: "stop_loss", value: -2 }],
    sharpeRatio: 1.82, totalReturnPct: 14.3, winRate: 68, maxDrawdownPct: 5.2, totalTrades: 89,
    createdAt: new Date(Date.now() - 86400_000 * 30).toISOString(),
  },
  {
    id: "strat-2", name: "Gold Breakout", symbol: "GOLD", enabled: true,
    conditions: [{ indicator: "SMA", operator: "crosses_above", value: 200 }, { indicator: "Volume", operator: "gt", value: 1.5 }],
    actions: [{ type: "buy", size: 5 }, { type: "take_profit", value: 3 }],
    sharpeRatio: 1.45, totalReturnPct: 8.7, winRate: 55, maxDrawdownPct: 7.8, totalTrades: 42,
    createdAt: new Date(Date.now() - 86400_000 * 14).toISOString(),
  },
  {
    id: "strat-3", name: "Crypto Momentum", symbol: "BTC", enabled: false,
    conditions: [{ indicator: "MACD", operator: "crosses_above", value: 0 }, { indicator: "RSI", operator: "gt", value: 50 }],
    actions: [{ type: "buy", size: 0.1 }, { type: "stop_loss", value: -5 }],
    sharpeRatio: 0.94, totalReturnPct: -2.1, winRate: 48, maxDrawdownPct: 12.4, totalTrades: 23,
    createdAt: new Date(Date.now() - 86400_000 * 7).toISOString(),
  },
];

// ─── Backtests ──────────────────────────────────────────────────────────

export const mockBacktests = [
  {
    id: "bt-1", strategy: "WTI Mean Reversion", symbol: "WTI", startDate: "2025-01-01", endDate: "2025-12-31",
    initialBalance: 100000, finalEquity: 114300, totalReturn: 14300, totalReturnPct: 14.3,
    totalTrades: 89, winRate: 68, sharpeRatio: 1.82, maxDrawdownPct: 5.2, status: "completed",
    createdAt: new Date(Date.now() - 86400_000 * 5).toISOString(),
  },
  {
    id: "bt-2", strategy: "Gold Breakout", symbol: "GOLD", startDate: "2025-06-01", endDate: "2025-12-31",
    initialBalance: 100000, finalEquity: 108700, totalReturn: 8700, totalReturnPct: 8.7,
    totalTrades: 42, winRate: 55, sharpeRatio: 1.45, maxDrawdownPct: 7.8, status: "completed",
    createdAt: new Date(Date.now() - 86400_000 * 3).toISOString(),
  },
  {
    id: "bt-3", strategy: "Crypto Momentum", symbol: "BTC", startDate: "2025-09-01", endDate: "2025-12-31",
    initialBalance: 100000, finalEquity: 97900, totalReturn: -2100, totalReturnPct: -2.1,
    totalTrades: 23, winRate: 48, sharpeRatio: 0.94, maxDrawdownPct: 12.4, status: "completed",
    createdAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
  },
];

// ─── Price Alerts ───────────────────────────────────────────────────────

export const mockAlerts = [
  { id: "alert-1", symbol: "WTI", condition: "above", threshold: 80.00, currentPrice: 78.43, active: true, triggerOnce: true, createdAt: new Date(Date.now() - 86400_000 * 3).toISOString() },
  { id: "alert-2", symbol: "GOLD", condition: "below", threshold: 2000.00, currentPrice: 2034.50, active: true, triggerOnce: false, createdAt: new Date(Date.now() - 86400_000 * 7).toISOString() },
  { id: "alert-3", symbol: "BTC", condition: "above", threshold: 70000, currentPrice: 67500, active: true, triggerOnce: true, createdAt: new Date(Date.now() - 86400_000 * 1).toISOString() },
  { id: "alert-4", symbol: "NGAS", condition: "below", threshold: 2.00, currentPrice: 2.14, active: false, triggerOnce: true, triggeredAt: new Date(Date.now() - 86400_000 * 2).toISOString(), createdAt: new Date(Date.now() - 86400_000 * 10).toISOString() },
];

// ─── Journal Entries ────────────────────────────────────────────────────

export const mockJournal = [
  { id: "j-1", symbol: "WTI", side: "long", thesis: "Oversold on RSI, expected bounce from support at $76. EIA draw was bullish.", lessons: "Entry was good, but I exited too early. Should have held for the full move.", tags: ["mean-reversion", "energy"], rating: 4, pnlAtNote: 320, createdAt: new Date(Date.now() - 86400_000 * 2).toISOString() },
  { id: "j-2", symbol: "GOLD", side: "long", thesis: "Broke above $2020 resistance with volume. MACD bullish crossover.", lessons: "Good trend-following trade. Position sizing was appropriate.", tags: ["breakout", "metals"], rating: 5, pnlAtNote: 580, createdAt: new Date(Date.now() - 86400_000 * 5).toISOString() },
  { id: "j-3", symbol: "BTC", side: "short", thesis: "Extreme funding rate, RSI overbought. Expected mean reversion.", lessons: "Timing was off. Market stayed irrational longer than my position lasted.", tags: ["crypto", "contrarian"], rating: 2, pnlAtNote: -150, createdAt: new Date(Date.now() - 86400_000 * 8).toISOString() },
];

// ─── Leaderboard ────────────────────────────────────────────────────────

export const mockLeaderboard = [
  { userId: "u1", username: "OilBull_2024", rank: 1, totalPnl: 28450, totalTrades: 342, totalPositions: 12, exposure: 45000, tier: "professional" },
  { userId: "u2", username: "GoldRush", rank: 2, totalPnl: 21200, totalTrades: 189, totalPositions: 8, exposure: 38000, tier: "professional" },
  { userId: "u3", username: "NatGasNinja", rank: 3, totalPnl: 18900, totalTrades: 267, totalPositions: 15, exposure: 52000, tier: "enterprise" },
  { userId: "u4", username: "CryptoWhale", rank: 4, totalPnl: 15600, totalTrades: 534, totalPositions: 6, exposure: 95000, tier: "professional" },
  { userId: "u5", username: "BrentTrader", rank: 5, totalPnl: 12300, totalTrades: 156, totalPositions: 10, exposure: 29000, tier: "free" },
  { userId: "u6", username: "SilverFox", rank: 6, totalPnl: 9800, totalTrades: 98, totalPositions: 4, exposure: 18000, tier: "free" },
  { userId: "u7", username: "CopperKing", rank: 7, totalPnl: 7200, totalTrades: 134, totalPositions: 7, exposure: 22000, tier: "free" },
  { userId: "u8", username: "FuturesFan", rank: 8, totalPnl: 5400, totalTrades: 78, totalPositions: 3, exposure: 15000, tier: "free" },
];

// ─── Watchlist Quotes ───────────────────────────────────────────────────

export function mockWatchlistQuotes(symbols: string[]): MarketData[] {
  return symbols.map((sym) => mockQuotes.find((q) => q.symbol === sym) ?? {
    symbol: sym, price: 50 + Math.random() * 100, change24h: (Math.random() - 0.5) * 4,
    volume24h: Math.floor(Math.random() * 100000), high24h: 55, low24h: 45,
    bid: 49.90, ask: 50.10, spread: 0.20, timestamp: Date.now(),
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100; }
