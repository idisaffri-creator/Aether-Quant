// ============================================================
// Aether Quant v2 – Realistic Mock Data
// Design: Void Terminal / Deep Space Command Center
// Terminology: Autonomous Trading Agents (not bots)
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

// ============================================================
// AGENT IDENTITY ARCHITECTURE (SOUL.md pattern)
// ============================================================

export interface AgentIdentity {
  id: string;
  name: string;
  role: string;
  avatar: string; // emoji icon
  asset: string;
  status: "running" | "stopped";
  // SOUL.md fields
  personality: string;
  rules: string[];
  skills: string[];
  schedule: { label: string; time: string }[];
  heartbeatPattern: string;
  // Context system (6 markdown files concept)
  context: {
    market: string[];   // data feeds monitored
    strategy: string;   // ATEE parameters
    risk: string[];     // limits and constraints
    memory: string[];   // past trades, lessons learned
  };
  // Performance
  dailyPnl: number;
  totalPnl: number;
  cumulativeValue: number;
  performanceFee: number;
  uptime: string;
  tradeCount: number;
  winRate: number;
  lastHeartbeat: Date;
  strategy: string;
  riskLevel: string;
  domainPersona: string;
}

export const agentsData: AgentIdentity[] = [
  {
    id: "agent-001",
    name: "Alpha Crude Momentum",
    role: "Energy Trading Specialist",
    avatar: "🛢️",
    asset: "CL (Crude Oil)",
    status: "running",
    personality: "Aggressive momentum hunter with disciplined risk management. Thrives in trending markets, steps aside during consolidation.",
    rules: [
      "Max position size: 3% of portfolio",
      "Daily loss limit: $5,000",
      "No trades during OPEC announcements",
      "Minimum 2:1 reward-to-risk ratio",
    ],
    skills: ["ATEE Extraction", "Momentum Analysis", "Backtest Engine", "Order Execution", "Risk Monitoring"],
    schedule: [
      { label: "Pre-market scan", time: "06:00 ET" },
      { label: "Signal generation", time: "09:15 ET" },
      { label: "Active trading", time: "09:30–15:00 ET" },
      { label: "EOD reconciliation", time: "16:00 ET" },
      { label: "Overnight analysis", time: "20:00 ET" },
    ],
    heartbeatPattern: "Every 30 seconds during market hours",
    context: {
      market: ["Bloomberg CL futures", "Kpler tanker flows", "EIA inventory data", "OPEC+ newsfeeds", "Brent-WTI spread"],
      strategy: "Mean Reversion + Momentum Crossover | Lookback: 20 | Entry: 1.5σ | SL: 2 ATR | TP: 4.5 ATR",
      risk: ["Max drawdown: 12%", "Correlation limit: 0.6 with other agents", "Position sizing: Kelly criterion (half-Kelly)", "Circuit breaker: -3% intraday"],
      memory: ["Learned to avoid trading during API report release", "Improved exit timing after Q1 2026 review", "Reduced position size during low-vol regimes"],
    },
    dailyPnl: 3420,
    totalPnl: 48750,
    cumulativeValue: 148200,
    performanceFee: 14820,
    uptime: "14d 7h 23m",
    tradeCount: 156,
    winRate: 68.5,
    lastHeartbeat: new Date(Date.now() - 3000),
    strategy: "Mean Reversion + Momentum Crossover",
    riskLevel: "Medium",
    domainPersona: "Energy Specialist — WTI/Brent correlation, OPEC sentiment, inventory cycles",
  },
  {
    id: "agent-002",
    name: "Gold Spread Arb",
    role: "Precious Metals Analyst",
    avatar: "🥇",
    asset: "GC (Gold)",
    status: "running",
    personality: "Patient, methodical arbitrageur. Waits for high-probability setups in term structure dislocations.",
    rules: [
      "Max position size: 2% of portfolio",
      "Only trade when spread > 2σ from mean",
      "No new positions 1hr before FOMC",
      "Max 3 concurrent spread positions",
    ],
    skills: ["Spread Analysis", "Term Structure Modeling", "Calendar Roll Timing", "Order Execution", "Central Bank Monitoring"],
    schedule: [
      { label: "Overnight spread scan", time: "05:00 ET" },
      { label: "Asian session review", time: "07:00 ET" },
      { label: "Active arbitrage", time: "08:30–14:00 ET" },
      { label: "Position roll check", time: "14:30 ET" },
      { label: "Risk report", time: "16:30 ET" },
    ],
    heartbeatPattern: "Every 45 seconds during market hours",
    context: {
      market: ["COMEX gold futures curve", "Central bank gold reserves", "ETF flows (GLD/IAU)", "USD index", "Real yields (TIPS)"],
      strategy: "Calendar Spread Arbitrage | Z-score entry: 2.0 | Mean reversion target | Roll-adjusted",
      risk: ["Max drawdown: 8%", "Spread convergence timeout: 5 days", "Leg risk limit: $2,000", "No naked directional exposure"],
      memory: ["FOMC meetings cause spread widening — learned to flatten before", "Asian session offers best entry liquidity", "Reduced size during options expiry weeks"],
    },
    dailyPnl: -1280,
    totalPnl: 31200,
    cumulativeValue: 89400,
    performanceFee: 8940,
    uptime: "8d 12h 45m",
    tradeCount: 89,
    winRate: 72.1,
    lastHeartbeat: new Date(Date.now() - 5000),
    strategy: "Calendar Spread Arbitrage",
    riskLevel: "Low",
    domainPersona: "Precious Metals Analyst — term structure, central bank flows, safe-haven dynamics",
  },
  {
    id: "agent-003",
    name: "NatGas Volatility",
    role: "Gas Market Expert",
    avatar: "🔥",
    asset: "NG (Natural Gas)",
    status: "running",
    personality: "High-frequency volatility trader. Embraces chaos in weather-driven markets. Quick to cut losses.",
    rules: [
      "Max position size: 4% of portfolio",
      "Daily loss limit: $8,000",
      "Scale into positions (3 tranches)",
      "Exit all before storage report if >2x normal vol",
    ],
    skills: ["Volatility Modeling", "Weather Data Integration", "Straddle Construction", "Rapid Execution", "Storage Report Analysis"],
    schedule: [
      { label: "Weather model check", time: "05:30 ET" },
      { label: "Pre-open vol assessment", time: "08:45 ET" },
      { label: "Active trading", time: "09:30–14:30 ET" },
      { label: "Storage report trade", time: "10:30 ET (Thu)" },
      { label: "EOD vol reconciliation", time: "15:00 ET" },
    ],
    heartbeatPattern: "Every 15 seconds during market hours",
    context: {
      market: ["Henry Hub futures", "NOAA weather forecasts", "EIA storage reports", "LNG cargo tracking (Kpler)", "Power grid demand data"],
      strategy: "Straddle on Volatility Breakout | ATR multiplier: 2.5 | Vol regime filter | Weather catalyst trigger",
      risk: ["Max drawdown: 18%", "Position timeout: 4 hours", "Vol crush protection: exit if IV drops 20%", "No overnight during polar vortex events"],
      memory: ["Storage report Thursdays are highest-edge days", "Polar vortex 2026 taught faster exit discipline", "Summer shoulder months = reduce size 50%"],
    },
    dailyPnl: 5670,
    totalPnl: 22100,
    cumulativeValue: 67800,
    performanceFee: 6780,
    uptime: "3d 18h 12m",
    tradeCount: 234,
    winRate: 61.3,
    lastHeartbeat: new Date(Date.now() - 2000),
    strategy: "Straddle on Volatility Breakout",
    riskLevel: "High",
    domainPersona: "Gas Market Expert — weather models, storage reports, LNG cargo flows",
  },
  {
    id: "agent-004",
    name: "Copper Trend Follow",
    role: "Industrial Metals Tracker",
    avatar: "🏭",
    asset: "HG (Copper)",
    status: "stopped",
    personality: "Patient trend follower. Lets winners run, cuts losers quickly. Focused on macro-driven moves.",
    rules: [
      "Max position size: 2.5% of portfolio",
      "Only enter on confirmed trend (ADX > 25)",
      "Trail stop at 2 ATR",
      "No counter-trend trades",
    ],
    skills: ["Trend Detection", "Macro Analysis", "Moving Average Systems", "Position Sizing", "China PMI Monitoring"],
    schedule: [
      { label: "China data review", time: "21:00 ET (prev day)" },
      { label: "LME open scan", time: "03:00 ET" },
      { label: "COMEX session", time: "08:30–13:00 ET" },
      { label: "Trend assessment", time: "15:00 ET" },
      { label: "Weekly macro review", time: "Fri 16:00 ET" },
    ],
    heartbeatPattern: "Every 60 seconds during market hours",
    context: {
      market: ["COMEX copper futures", "LME warehouse stocks", "China PMI data", "Chile/Peru production", "Green transition demand forecasts"],
      strategy: "Dual Moving Average Crossover | Fast: 10 | Slow: 30 | ADX filter > 25 | Trail: 2 ATR",
      risk: ["Max drawdown: 15%", "Single trade risk: 1.5%", "No leverage > 3x", "Pause during Chinese holidays"],
      memory: ["China PMI below 50 = reduce exposure immediately", "LME warehouse drawdowns precede rallies by 2-3 days", "Stopped due to sideways market — awaiting trend confirmation"],
    },
    dailyPnl: 0,
    totalPnl: 15800,
    cumulativeValue: 42300,
    performanceFee: 4230,
    uptime: "0d 0h 0m",
    tradeCount: 67,
    winRate: 65.7,
    lastHeartbeat: new Date(Date.now() - 86400000),
    strategy: "Dual Moving Average Crossover",
    riskLevel: "Medium",
    domainPersona: "Industrial Metals Tracker — China PMI, LME warehouse, green transition demand",
  },
  {
    id: "agent-005",
    name: "Wheat Seasonal",
    role: "Agricultural Specialist",
    avatar: "🌾",
    asset: "ZW (Wheat)",
    status: "running",
    personality: "Seasonal pattern expert. Combines fundamental crop data with statistical seasonality for high win-rate trades.",
    rules: [
      "Max position size: 1.5% of portfolio",
      "Only trade during seasonal windows",
      "Exit before WASDE report if P&L > target",
      "Max holding period: 21 days",
    ],
    skills: ["Seasonal Analysis", "WASDE Report Parsing", "Crop Progress Monitoring", "Pattern Recognition", "Export Flow Tracking"],
    schedule: [
      { label: "Crop progress check", time: "07:00 ET" },
      { label: "Export inspection data", time: "08:00 ET (Mon)" },
      { label: "Active trading", time: "09:30–13:15 ET" },
      { label: "WASDE positioning", time: "11:30 ET (report days)" },
      { label: "Weekly seasonal review", time: "Fri 14:00 ET" },
    ],
    heartbeatPattern: "Every 120 seconds during market hours",
    context: {
      market: ["CBOT wheat futures", "USDA WASDE reports", "Crop progress reports", "Export inspections", "Black Sea shipping data"],
      strategy: "Seasonal Pattern + RSI Filter | Window: Mar-May, Aug-Oct | RSI < 30 entry | 21-day max hold",
      risk: ["Max drawdown: 7.8%", "No position during WASDE release hour", "Weather event override: flatten if drought/flood", "Max 2 concurrent positions"],
      memory: ["Spring rally pattern strongest in planting delay years", "WASDE surprises cause 3-5% moves — stay flat", "Black Sea export disruptions = immediate long bias"],
    },
    dailyPnl: 890,
    totalPnl: 8450,
    cumulativeValue: 28900,
    performanceFee: 2890,
    uptime: "21d 3h 56m",
    tradeCount: 42,
    winRate: 76.2,
    lastHeartbeat: new Date(Date.now() - 4000),
    strategy: "Seasonal Pattern + RSI Filter",
    riskLevel: "Low",
    domainPersona: "Agri Specialist — WASDE reports, planting progress, export inspections",
  },
  {
    id: "agent-006",
    name: "Silver 0DTE Options",
    role: "Options Volatility Expert",
    avatar: "⚡",
    asset: "SI (Silver)",
    status: "running",
    personality: "Aggressive options trader. Exploits short-dated volatility mispricing with precise gamma management.",
    rules: [
      "Max notional: 5% of portfolio",
      "Delta-neutral at all times (±0.05)",
      "Close all positions by 15:45 ET",
      "No new trades if VIX > 35",
    ],
    skills: ["Options Pricing", "Greeks Management", "Gamma Scalping", "Volatility Surface Analysis", "Dealer Positioning Intel"],
    schedule: [
      { label: "Vol surface analysis", time: "08:00 ET" },
      { label: "Structure selection", time: "09:15 ET" },
      { label: "Active gamma scalping", time: "09:30–15:30 ET" },
      { label: "Position unwind", time: "15:30–15:45 ET" },
      { label: "P&L attribution", time: "16:00 ET" },
    ],
    heartbeatPattern: "Every 10 seconds during market hours",
    context: {
      market: ["COMEX silver options chain", "Implied vol surface", "Dealer gamma exposure (GEX)", "Silver ETF flows (SLV)", "Skew dynamics"],
      strategy: "0DTE Iron Condor with Delta Hedge | Wings: 1σ | Gamma scalp threshold: 0.02δ | Unwind T-15min",
      risk: ["Max drawdown: 22%", "Pin risk management: close if within 0.5% of strike", "No positions into Fed speakers", "Gamma limit: $500/1% move"],
      memory: ["Tuesday/Thursday have best vol premium", "Avoid silver during gold FOMC reactions", "Dealer positioning flips at $25 strike = key level"],
    },
    dailyPnl: 2150,
    totalPnl: 19300,
    cumulativeValue: 56200,
    performanceFee: 5620,
    uptime: "6d 9h 30m",
    tradeCount: 312,
    winRate: 58.9,
    lastHeartbeat: new Date(Date.now() - 1000),
    strategy: "0DTE Iron Condor with Delta Hedge",
    riskLevel: "High",
    domainPersona: "Options Volatility Expert — gamma exposure, dealer positioning, skew dynamics",
  },
];

// Agent trade logs
export const agentTradeLogs: Record<string, Array<{
  id: number;
  time: string;
  action: string;
  price: number;
  quantity: number;
  pnl: number | null;
}>> = {
  "agent-001": [
    { id: 1, time: "2026-05-01 09:31:02", action: "BUY", price: 71.45, quantity: 10, pnl: null },
    { id: 2, time: "2026-05-01 14:22:18", action: "SELL", price: 73.12, quantity: 10, pnl: 1670 },
    { id: 3, time: "2026-05-02 09:30:45", action: "SELL SHORT", price: 73.80, quantity: 8, pnl: null },
    { id: 4, time: "2026-05-02 11:45:33", action: "BUY COVER", price: 72.95, quantity: 8, pnl: 680 },
    { id: 5, time: "2026-05-03 10:15:22", action: "BUY", price: 72.10, quantity: 12, pnl: null },
    { id: 6, time: "2026-05-03 15:30:11", action: "SELL", price: 72.85, quantity: 12, pnl: 900 },
  ],
  "agent-002": [
    { id: 1, time: "2026-04-30 09:30:15", action: "BUY", price: 2045.30, quantity: 2, pnl: null },
    { id: 2, time: "2026-04-30 14:00:22", action: "SELL", price: 2052.80, quantity: 2, pnl: 1500 },
    { id: 3, time: "2026-05-01 10:00:05", action: "BUY", price: 2058.10, quantity: 3, pnl: null },
    { id: 4, time: "2026-05-01 15:45:30", action: "SELL", price: 2049.20, quantity: 3, pnl: -2670 },
  ],
};

// Strategy Library
export const strategyLibrary = [
  {
    id: "strat-001",
    name: "Crude Oil Mean Reversion",
    asset: "CL (Crude Oil)",
    type: "Backtest",
    date: "2026-04-15",
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
    date: "2026-04-12",
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
    date: "2026-04-10",
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
    date: "2026-04-08",
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
    date: "2026-04-05",
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
    date: "2026-04-01",
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
    date: "2026-03-28",
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
    date: "2026-03-25",
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
  activeAgents: 5,
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
  { id: 1, type: "trade", message: "Alpha Crude Momentum agent executed BUY CL @ $72.85", time: "2 min ago" },
  { id: 2, type: "agent", message: "NatGas Volatility agent heartbeat confirmed", time: "5 min ago" },
  { id: 3, type: "alert", message: "Gold Spread Arb agent daily loss limit at 60%", time: "12 min ago" },
  { id: 4, type: "strategy", message: "Backtest completed: Crude Crack Spread", time: "1 hour ago" },
  { id: 5, type: "trade", message: "Wheat Seasonal agent executed SELL ZW @ $628.75", time: "2 hours ago" },
  { id: 6, type: "system", message: "Risk layer updated: new correlation limits", time: "3 hours ago" },
  { id: 7, type: "agent", message: "Silver 0DTE Options agent deployed to workforce", time: "6 hours ago" },
  { id: 8, type: "strategy", message: "Agent-driven discovery completed: Multi-Commodity Momentum", time: "8 hours ago" },
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

// ============================================================
// OUTCOME BILLING & ATTRIBUTION DATA
// ============================================================

export const currentPlan = {
  tier: "Full AETHER" as const,
  monthlyFee: 199,
  agentsIncluded: 10,
  agentsActive: 5,
  additionalAgentCost: 29,
  performanceFeeRate: 0.10,
  optimizationCreditsTotal: -1,
  optimizationCreditsUsed: 47,
};

export const billingData = {
  currentMonth: "May 2026",
  billingCycleStart: "2026-05-01",
  billingCycleEnd: "2026-05-31",
  daysRemaining: 30,
  totalValueGenerated: 145600,
  performanceFeesAccrued: 14560,
  accessFee: 199,
  estimatedBill: 14759,
  creditsUsed: 47,
  creditsRemaining: -1,
  previousMonths: [
    { month: "Apr 2026", valueGenerated: 128400, performanceFee: 12840, accessFee: 199, total: 13039 },
    { month: "Mar 2026", valueGenerated: 98200, performanceFee: 9820, accessFee: 199, total: 10019 },
    { month: "Feb 2026", valueGenerated: 72100, performanceFee: 7210, accessFee: 199, total: 7409 },
    { month: "Jan 2026", valueGenerated: 54800, performanceFee: 5480, accessFee: 199, total: 5679 },
  ],
};

export const agentAttribution = [
  { agentId: "agent-001", name: "Alpha Crude Momentum", valueGenerated: 48750, performanceFee: 4875, tradesExecuted: 156, roi: 34.2 },
  { agentId: "agent-002", name: "Gold Spread Arb", valueGenerated: 31200, performanceFee: 3120, tradesExecuted: 89, roi: 22.8 },
  { agentId: "agent-003", name: "NatGas Volatility", valueGenerated: 22100, performanceFee: 2210, tradesExecuted: 234, roi: 18.4 },
  { agentId: "agent-004", name: "Copper Trend Follow", valueGenerated: 15800, performanceFee: 1580, tradesExecuted: 67, roi: 12.6 },
  { agentId: "agent-005", name: "Wheat Seasonal", valueGenerated: 8450, performanceFee: 845, tradesExecuted: 42, roi: 9.8 },
  { agentId: "agent-006", name: "Silver 0DTE Options", valueGenerated: 19300, performanceFee: 1930, tradesExecuted: 312, roi: 28.1 },
];

export const valueVsCostData = [
  { month: "Jan", valueGenerated: 54800, costPaid: 5679, ratio: 9.65 },
  { month: "Feb", valueGenerated: 72100, costPaid: 7409, ratio: 9.73 },
  { month: "Mar", valueGenerated: 98200, costPaid: 10019, ratio: 9.80 },
  { month: "Apr", valueGenerated: 128400, costPaid: 13039, ratio: 9.85 },
  { month: "May*", valueGenerated: 145600, costPaid: 14759, ratio: 9.86 },
];

export const pricingTiers = [
  {
    name: "Intelligence Feed",
    price: 30,
    agents: 0,
    additionalAgent: null,
    performanceFee: null,
    optimizationCredits: 0,
    features: ["Market intelligence feed", "Strategy ideas", "Read-only access"],
  },
  {
    name: "Strategy Studio",
    price: 99,
    agents: 3,
    additionalAgent: 49,
    performanceFee: 10,
    optimizationCredits: 20,
    features: ["3 autonomous agents", "Backtest engine", "20 optimization runs/mo", "10% performance fee"],
  },
  {
    name: "Full AETHER",
    price: 199,
    agents: 10,
    additionalAgent: 29,
    performanceFee: 10,
    optimizationCredits: -1,
    features: ["10 autonomous agents", "Unlimited optimizations", "Priority execution", "10% performance fee", "Domain intelligence layer"],
    current: true,
  },
];

// ============================================================
// SKILL CHAINING PIPELINE
// ============================================================

export const skillPipeline = [
  { id: 1, name: "Extract", description: "Parse trading ideas from text, video, PDF, or code", icon: "📥", status: "complete" as const },
  { id: 2, name: "Analyze", description: "Domain intelligence validates idea feasibility", icon: "🔍", status: "complete" as const },
  { id: 3, name: "Backtest", description: "Run against 10+ years of institutional data", icon: "📊", status: "complete" as const },
  { id: 4, name: "Optimize", description: "AI-driven parameter search for best performance", icon: "⚙️", status: "complete" as const },
  { id: 5, name: "Deploy", description: "Launch as autonomous trading agent", icon: "🚀", status: "active" as const },
  { id: 6, name: "Monitor", description: "Real-time risk overlay and heartbeat tracking", icon: "👁️", status: "active" as const },
  { id: 7, name: "Report", description: "P&L attribution and outcome billing", icon: "📋", status: "active" as const },
];

// ============================================================
// DAILY OPERATIONS TIMELINE
// ============================================================

export const dailyTimeline = [
  {
    time: "05:00–06:00 ET",
    phase: "Pre-Market Intelligence",
    description: "Agents scan overnight developments, weather data, Asian session activity, and news feeds.",
    agents: ["Alpha Crude Momentum", "Gold Spread Arb", "NatGas Volatility"],
    color: "oklch(0.7 0.12 250)",
  },
  {
    time: "06:00–09:15 ET",
    phase: "Strategy Preparation",
    description: "Signal generation, position review, risk parameter updates, and order staging.",
    agents: ["All Active Agents"],
    color: "oklch(0.75 0.15 80)",
  },
  {
    time: "09:15–09:30 ET",
    phase: "Market Open Positioning",
    description: "Final pre-open checks, order queue verification, and opening auction participation.",
    agents: ["Alpha Crude Momentum", "NatGas Volatility", "Silver 0DTE Options"],
    color: "oklch(0.82 0.15 195)",
  },
  {
    time: "09:30–12:00 ET",
    phase: "Active Trading — Morning Session",
    description: "Primary execution window. Agents trade signals, manage positions, and scalp gamma.",
    agents: ["All Active Agents"],
    color: "oklch(0.82 0.19 160)",
  },
  {
    time: "12:00–14:00 ET",
    phase: "Midday Assessment",
    description: "P&L check, position adjustment, risk rebalancing, and afternoon strategy selection.",
    agents: ["Gold Spread Arb", "Wheat Seasonal", "Copper Trend Follow"],
    color: "oklch(0.82 0.15 195)",
  },
  {
    time: "14:00–15:30 ET",
    phase: "Active Trading — Afternoon Session",
    description: "Second execution window. Options unwind, spread convergence, and momentum continuation.",
    agents: ["Silver 0DTE Options", "Alpha Crude Momentum", "NatGas Volatility"],
    color: "oklch(0.82 0.19 160)",
  },
  {
    time: "15:30–16:00 ET",
    phase: "End of Day Reconciliation",
    description: "Close intraday positions, reconcile fills, calculate daily P&L, update agent memory.",
    agents: ["All Active Agents"],
    color: "oklch(0.75 0.15 80)",
  },
  {
    time: "16:00–20:00 ET",
    phase: "Post-Market Analysis",
    description: "Strategy optimization, backtest new ideas, risk report generation, next-day preparation.",
    agents: ["Alpha Crude Momentum", "NatGas Volatility"],
    color: "oklch(0.7 0.12 250)",
  },
];

// ============================================================
// COMPOUNDING VALUE DATA (Week 1 to Week 8+)
// ============================================================

export const compoundingData = [
  { week: "Week 1", value: 8200, trades: 45, winRate: 55, improvement: "Baseline" },
  { week: "Week 2", value: 18500, trades: 62, winRate: 58, improvement: "Learned market microstructure" },
  { week: "Week 3", value: 31200, trades: 78, winRate: 61, improvement: "Optimized entry timing" },
  { week: "Week 4", value: 48900, trades: 95, winRate: 64, improvement: "Reduced false signals" },
  { week: "Week 5", value: 72400, trades: 112, winRate: 66, improvement: "Better risk sizing" },
  { week: "Week 6", value: 98700, trades: 128, winRate: 67, improvement: "Cross-agent correlation" },
  { week: "Week 7", value: 121300, trades: 141, winRate: 68, improvement: "Memory-driven exits" },
  { week: "Week 8+", value: 145600, trades: 156, winRate: 69, improvement: "Compound intelligence" },
];

// ============================================================
// BEFORE vs AFTER COMPARISON
// ============================================================

export const beforeAfterData = {
  before: [
    { metric: "Backtest Time", value: "2–3 days", icon: "⏱️" },
    { metric: "Strategy Ideas/Month", value: "3–5", icon: "💡" },
    { metric: "Execution Speed", value: "Minutes (manual)", icon: "🐌" },
    { metric: "Market Coverage", value: "1–2 commodities", icon: "📉" },
    { metric: "Operating Hours", value: "8 hrs/day", icon: "🕐" },
    { metric: "Monthly Cost", value: "$15,000+ (analyst team)", icon: "💸" },
  ],
  after: [
    { metric: "Backtest Time", value: "< 30 seconds", icon: "⚡" },
    { metric: "Strategy Ideas/Month", value: "50+ (AI-generated)", icon: "🧠" },
    { metric: "Execution Speed", value: "Milliseconds (automated)", icon: "🚀" },
    { metric: "Market Coverage", value: "6+ commodities 24/7", icon: "🌍" },
    { metric: "Operating Hours", value: "24/7 autonomous", icon: "♾️" },
    { metric: "Monthly Cost", value: "$199 + 10% of profits", icon: "✅" },
  ],
};
