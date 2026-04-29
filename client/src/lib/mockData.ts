// ============================================================
// Aether Quant – Realistic Mock Data
// Design: Void Terminal / Deep Space Command Center
// ============================================================

// Seeded PRNG for deterministic data
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seededRandom(42);

// Equity curve data (10 years of monthly returns)
export const equityCurveData = (() => {
  const data: { date: string; equity: number; benchmark: number }[] = [];
  let equity = 100000;
  let benchmark = 100000;
  const startDate = new Date(2016, 0, 1);
  for (let i = 0; i < 120; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const monthStr = d.toISOString().slice(0, 7);
    const eReturn = 1 + (rand() * 0.08 - 0.025);
    const bReturn = 1 + (rand() * 0.06 - 0.025);
    equity *= eReturn;
    benchmark *= bReturn;
    data.push({
      date: monthStr,
      equity: Math.round(equity),
      benchmark: Math.round(benchmark),
    });
  }
  return data;
})();

// Trade list for backtest
export const tradeList = [
  { id: 1, asset: "CL (Crude Oil)", direction: "Long", entry: "2025-12-02 09:31", exit: "2025-12-02 14:22", entryPrice: 71.45, exitPrice: 73.12, returnPct: 2.34, pnl: 1670 },
  { id: 2, asset: "NG (Natural Gas)", direction: "Short", entry: "2025-12-03 10:15", exit: "2025-12-03 15:45", entryPrice: 3.42, exitPrice: 3.28, returnPct: 4.09, pnl: 1400 },
  { id: 3, asset: "GC (Gold)", direction: "Long", entry: "2025-12-04 09:30", exit: "2025-12-05 11:00", entryPrice: 2045.30, exitPrice: 2078.60, returnPct: 1.63, pnl: 3330 },
  { id: 4, asset: "SI (Silver)", direction: "Long", entry: "2025-12-05 10:00", exit: "2025-12-05 15:30", entryPrice: 24.15, exitPrice: 23.82, returnPct: -1.37, pnl: -1650 },
  { id: 5, asset: "CL (Crude Oil)", direction: "Short", entry: "2025-12-06 09:45", exit: "2025-12-06 13:20", entryPrice: 72.80, exitPrice: 71.55, returnPct: 1.72, pnl: 1250 },
  { id: 6, asset: "HG (Copper)", direction: "Long", entry: "2025-12-09 10:30", exit: "2025-12-10 14:00", entryPrice: 3.85, exitPrice: 3.97, returnPct: 3.12, pnl: 3000 },
  { id: 7, asset: "NG (Natural Gas)", direction: "Long", entry: "2025-12-10 09:31", exit: "2025-12-10 15:59", entryPrice: 3.18, exitPrice: 3.09, returnPct: -2.83, pnl: -900 },
  { id: 8, asset: "CL (Crude Oil)", direction: "Long", entry: "2025-12-11 09:30", exit: "2025-12-12 10:45", entryPrice: 70.92, exitPrice: 72.48, returnPct: 2.20, pnl: 1560 },
  { id: 9, asset: "GC (Gold)", direction: "Short", entry: "2025-12-12 11:00", exit: "2025-12-12 15:30", entryPrice: 2082.10, exitPrice: 2069.40, returnPct: 0.61, pnl: 1270 },
  { id: 10, asset: "ZW (Wheat)", direction: "Long", entry: "2025-12-13 09:30", exit: "2025-12-16 14:00", entryPrice: 612.50, exitPrice: 628.75, returnPct: 2.65, pnl: 812 },
  { id: 11, asset: "CL (Crude Oil)", direction: "Short", entry: "2025-12-16 10:15", exit: "2025-12-16 14:45", entryPrice: 73.20, exitPrice: 72.10, returnPct: 1.50, pnl: 1100 },
  { id: 12, asset: "NG (Natural Gas)", direction: "Long", entry: "2025-12-17 09:30", exit: "2025-12-18 11:30", entryPrice: 3.35, exitPrice: 3.52, returnPct: 5.07, pnl: 1700 },
];

// Backtest metrics
export const backtestMetrics = {
  cagr: 18.7,
  sharpe: 1.84,
  winRate: 68.3,
  maxDrawdown: -12.4,
  profitFactor: 2.31,
  tradeCount: 847,
  avgWin: 2.14,
  avgLoss: -1.38,
  totalReturn: 287.4,
  annualizedVol: 10.2,
};

// Optimization results (top 20 parameter sets)
export const optimizationResults = [
  { rank: 1, lookback: 20, threshold: 1.5, stopLoss: 2.0, takeProfit: 4.5, sharpe: 2.14, cagr: 22.3, winRate: 71.2, maxDD: -9.8 },
  { rank: 2, lookback: 25, threshold: 1.8, stopLoss: 2.5, takeProfit: 5.0, sharpe: 2.08, cagr: 21.1, winRate: 69.5, maxDD: -10.2 },
  { rank: 3, lookback: 15, threshold: 1.2, stopLoss: 1.5, takeProfit: 3.5, sharpe: 2.01, cagr: 20.8, winRate: 72.8, maxDD: -11.5 },
  { rank: 4, lookback: 30, threshold: 2.0, stopLoss: 3.0, takeProfit: 6.0, sharpe: 1.97, cagr: 19.9, winRate: 67.3, maxDD: -8.9 },
  { rank: 5, lookback: 20, threshold: 1.3, stopLoss: 2.0, takeProfit: 4.0, sharpe: 1.94, cagr: 19.5, winRate: 70.1, maxDD: -10.8 },
  { rank: 6, lookback: 18, threshold: 1.6, stopLoss: 2.2, takeProfit: 4.8, sharpe: 1.91, cagr: 19.2, winRate: 68.9, maxDD: -11.2 },
  { rank: 7, lookback: 22, threshold: 1.4, stopLoss: 1.8, takeProfit: 4.2, sharpe: 1.88, cagr: 18.8, winRate: 69.7, maxDD: -10.5 },
  { rank: 8, lookback: 28, threshold: 1.9, stopLoss: 2.8, takeProfit: 5.5, sharpe: 1.85, cagr: 18.5, winRate: 66.8, maxDD: -9.4 },
  { rank: 9, lookback: 16, threshold: 1.1, stopLoss: 1.6, takeProfit: 3.8, sharpe: 1.82, cagr: 18.2, winRate: 71.5, maxDD: -12.1 },
  { rank: 10, lookback: 24, threshold: 1.7, stopLoss: 2.4, takeProfit: 5.2, sharpe: 1.79, cagr: 17.9, winRate: 68.2, maxDD: -10.9 },
  { rank: 11, lookback: 12, threshold: 1.0, stopLoss: 1.4, takeProfit: 3.2, sharpe: 1.76, cagr: 17.6, winRate: 73.1, maxDD: -13.2 },
  { rank: 12, lookback: 35, threshold: 2.2, stopLoss: 3.2, takeProfit: 6.5, sharpe: 1.73, cagr: 17.3, winRate: 65.9, maxDD: -8.5 },
  { rank: 13, lookback: 20, threshold: 1.6, stopLoss: 2.1, takeProfit: 4.6, sharpe: 1.70, cagr: 17.0, winRate: 69.0, maxDD: -11.0 },
  { rank: 14, lookback: 26, threshold: 1.5, stopLoss: 2.6, takeProfit: 5.3, sharpe: 1.67, cagr: 16.7, winRate: 67.8, maxDD: -10.3 },
  { rank: 15, lookback: 14, threshold: 1.3, stopLoss: 1.7, takeProfit: 3.6, sharpe: 1.64, cagr: 16.4, winRate: 70.5, maxDD: -12.5 },
  { rank: 16, lookback: 32, threshold: 2.1, stopLoss: 3.1, takeProfit: 6.2, sharpe: 1.61, cagr: 16.1, winRate: 66.2, maxDD: -9.1 },
  { rank: 17, lookback: 19, threshold: 1.4, stopLoss: 1.9, takeProfit: 4.1, sharpe: 1.58, cagr: 15.8, winRate: 69.3, maxDD: -11.4 },
  { rank: 18, lookback: 21, threshold: 1.7, stopLoss: 2.3, takeProfit: 4.9, sharpe: 1.55, cagr: 15.5, winRate: 68.5, maxDD: -10.7 },
  { rank: 19, lookback: 27, threshold: 1.8, stopLoss: 2.7, takeProfit: 5.4, sharpe: 1.52, cagr: 15.2, winRate: 67.1, maxDD: -10.0 },
  { rank: 20, lookback: 17, threshold: 1.2, stopLoss: 1.5, takeProfit: 3.4, sharpe: 1.49, cagr: 14.9, winRate: 71.0, maxDD: -12.8 },
];

// Bot data
export const botsData = [
  {
    id: "bot-001",
    name: "Alpha Crude Momentum",
    asset: "CL (Crude Oil)",
    status: "running" as const,
    dailyPnl: 3420,
    totalPnl: 48750,
    uptime: "14d 7h 23m",
    tradeCount: 156,
    winRate: 68.5,
    lastHeartbeat: new Date(Date.now() - 3000),
    strategy: "Mean Reversion + Momentum Crossover",
    riskLevel: "Medium",
  },
  {
    id: "bot-002",
    name: "Gold Spread Arb",
    asset: "GC (Gold)",
    status: "running" as const,
    dailyPnl: -1280,
    totalPnl: 31200,
    uptime: "8d 12h 45m",
    tradeCount: 89,
    winRate: 72.1,
    lastHeartbeat: new Date(Date.now() - 5000),
    strategy: "Calendar Spread Arbitrage",
    riskLevel: "Low",
  },
  {
    id: "bot-003",
    name: "NatGas Volatility",
    asset: "NG (Natural Gas)",
    status: "running" as const,
    dailyPnl: 5670,
    totalPnl: 22100,
    uptime: "3d 18h 12m",
    tradeCount: 234,
    winRate: 61.3,
    lastHeartbeat: new Date(Date.now() - 2000),
    strategy: "Straddle on Volatility Breakout",
    riskLevel: "High",
  },
  {
    id: "bot-004",
    name: "Copper Trend Follow",
    asset: "HG (Copper)",
    status: "stopped" as const,
    dailyPnl: 0,
    totalPnl: 15800,
    uptime: "0d 0h 0m",
    tradeCount: 67,
    winRate: 65.7,
    lastHeartbeat: new Date(Date.now() - 86400000),
    strategy: "Dual Moving Average Crossover",
    riskLevel: "Medium",
  },
  {
    id: "bot-005",
    name: "Wheat Seasonal",
    asset: "ZW (Wheat)",
    status: "running" as const,
    dailyPnl: 890,
    totalPnl: 8450,
    uptime: "21d 3h 56m",
    tradeCount: 42,
    winRate: 76.2,
    lastHeartbeat: new Date(Date.now() - 4000),
    strategy: "Seasonal Pattern + RSI Filter",
    riskLevel: "Low",
  },
  {
    id: "bot-006",
    name: "Silver 0DTE Options",
    asset: "SI (Silver)",
    status: "running" as const,
    dailyPnl: 2150,
    totalPnl: 19300,
    uptime: "6d 9h 30m",
    tradeCount: 312,
    winRate: 58.9,
    lastHeartbeat: new Date(Date.now() - 1000),
    strategy: "0DTE Iron Condor with Delta Hedge",
    riskLevel: "High",
  },
];

// Bot trade logs
export const botTradeLogs: Record<string, Array<{
  id: number;
  time: string;
  action: string;
  price: number;
  quantity: number;
  pnl: number | null;
}>> = {
  "bot-001": [
    { id: 1, time: "2026-03-15 09:31:02", action: "BUY", price: 71.45, quantity: 10, pnl: null },
    { id: 2, time: "2026-03-15 14:22:18", action: "SELL", price: 73.12, quantity: 10, pnl: 1670 },
    { id: 3, time: "2026-03-16 09:30:45", action: "SELL SHORT", price: 73.80, quantity: 8, pnl: null },
    { id: 4, time: "2026-03-16 11:45:33", action: "BUY COVER", price: 72.95, quantity: 8, pnl: 680 },
    { id: 5, time: "2026-03-17 10:15:22", action: "BUY", price: 72.10, quantity: 12, pnl: null },
    { id: 6, time: "2026-03-17 15:30:11", action: "SELL", price: 72.85, quantity: 12, pnl: 900 },
  ],
  "bot-002": [
    { id: 1, time: "2026-03-14 09:30:15", action: "BUY", price: 2045.30, quantity: 2, pnl: null },
    { id: 2, time: "2026-03-14 14:00:22", action: "SELL", price: 2052.80, quantity: 2, pnl: 1500 },
    { id: 3, time: "2026-03-15 10:00:05", action: "BUY", price: 2058.10, quantity: 3, pnl: null },
    { id: 4, time: "2026-03-15 15:45:30", action: "SELL", price: 2049.20, quantity: 3, pnl: -2670 },
  ],
};

// Strategy Library
export const strategyLibrary = [
  {
    id: "strat-001",
    name: "Crude Oil Mean Reversion",
    asset: "CL (Crude Oil)",
    type: "Backtest",
    date: "2026-03-15",
    cagr: 18.7,
    sharpe: 1.84,
    winRate: 68.3,
    maxDrawdown: -12.4,
    status: "deployed",
    description: "Mean reversion strategy using Bollinger Bands with RSI confirmation on WTI Crude Oil futures.",
  },
  {
    id: "strat-002",
    name: "Gold Calendar Spread",
    asset: "GC (Gold)",
    type: "Optimization",
    date: "2026-03-12",
    cagr: 15.2,
    sharpe: 2.08,
    winRate: 72.1,
    maxDrawdown: -8.9,
    status: "saved",
    description: "Calendar spread strategy exploiting term structure in gold futures with dynamic roll timing.",
  },
  {
    id: "strat-003",
    name: "NatGas Vol Breakout",
    asset: "NG (Natural Gas)",
    type: "Backtest",
    date: "2026-03-10",
    cagr: 24.5,
    sharpe: 1.52,
    winRate: 61.3,
    maxDrawdown: -18.7,
    status: "deployed",
    description: "Volatility breakout strategy on natural gas using ATR-based entries with time-of-day filter.",
  },
  {
    id: "strat-004",
    name: "Copper Trend Following",
    asset: "HG (Copper)",
    type: "Backtest",
    date: "2026-03-08",
    cagr: 12.8,
    sharpe: 1.45,
    winRate: 55.7,
    maxDrawdown: -15.2,
    status: "saved",
    description: "Dual moving average crossover with ADX filter on copper futures for trend confirmation.",
  },
  {
    id: "strat-005",
    name: "Wheat Seasonal Pattern",
    asset: "ZW (Wheat)",
    type: "Optimization",
    date: "2026-03-05",
    cagr: 9.4,
    sharpe: 1.92,
    winRate: 76.2,
    maxDrawdown: -7.8,
    status: "deployed",
    description: "Seasonal pattern exploitation in wheat futures with RSI momentum filter and weather data overlay.",
  },
  {
    id: "strat-006",
    name: "Silver 0DTE Iron Condor",
    asset: "SI (Silver)",
    type: "Backtest",
    date: "2026-03-01",
    cagr: 31.2,
    sharpe: 1.38,
    winRate: 58.9,
    maxDrawdown: -22.1,
    status: "saved",
    description: "0DTE iron condor strategy on silver with delta hedging and gamma scalping adjustments.",
  },
  {
    id: "strat-007",
    name: "Multi-Commodity Momentum",
    asset: "Multi",
    type: "Optimization",
    date: "2026-02-28",
    cagr: 16.3,
    sharpe: 1.71,
    winRate: 64.8,
    maxDrawdown: -13.5,
    status: "saved",
    description: "Cross-commodity momentum strategy using relative strength across energy and metals sectors.",
  },
  {
    id: "strat-008",
    name: "Crude Crack Spread",
    asset: "CL/RB/HO",
    type: "Backtest",
    date: "2026-02-25",
    cagr: 14.1,
    sharpe: 1.65,
    winRate: 67.2,
    maxDrawdown: -11.8,
    status: "saved",
    description: "3:2:1 crack spread strategy trading crude oil against gasoline and heating oil futures.",
  },
];

// Dashboard overview metrics
export const dashboardMetrics = {
  totalPnl: 145600,
  dailyPnl: 10850,
  activeBots: 5,
  totalStrategies: 8,
  avgSharpe: 1.72,
  portfolioValue: 2450000,
  monthlyReturn: 4.2,
  ytdReturn: 18.7,
};

// Portfolio allocation data
export const portfolioAllocation = [
  { name: "Crude Oil", value: 35, color: "oklch(0.82 0.15 195)" },
  { name: "Gold", value: 25, color: "oklch(0.75 0.15 80)" },
  { name: "Natural Gas", value: 20, color: "oklch(0.82 0.19 160)" },
  { name: "Copper", value: 10, color: "oklch(0.7 0.12 250)" },
  { name: "Others", value: 10, color: "oklch(0.6 0.015 250)" },
];

// Recent activity feed
export const recentActivity = [
  { id: 1, type: "trade", message: "Alpha Crude Momentum executed BUY CL @ $72.85", time: "2 min ago", icon: "trade" },
  { id: 2, type: "bot", message: "NatGas Volatility bot heartbeat confirmed", time: "5 min ago", icon: "bot" },
  { id: 3, type: "alert", message: "Gold Spread Arb daily loss limit at 60%", time: "12 min ago", icon: "alert" },
  { id: 4, type: "strategy", message: "Backtest completed: Crude Crack Spread", time: "1 hour ago", icon: "strategy" },
  { id: 5, type: "trade", message: "Wheat Seasonal executed SELL ZW @ $628.75", time: "2 hours ago", icon: "trade" },
  { id: 6, type: "system", message: "Risk layer updated: new correlation limits", time: "3 hours ago", icon: "system" },
  { id: 7, type: "bot", message: "Silver 0DTE Options bot started successfully", time: "6 hours ago", icon: "bot" },
  { id: 8, type: "strategy", message: "Optimization completed: Multi-Commodity Momentum", time: "8 hours ago", icon: "strategy" },
];

// Daily PnL chart data (last 30 days)
export const dailyPnlData = (() => {
  const data: { date: string; pnl: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(5, 10);
    const pnl = Math.round((rand() * 12000 - 4000));
    cumulative += pnl;
    data.push({ date: dateStr, pnl, cumulative });
  }
  return data;
})();
