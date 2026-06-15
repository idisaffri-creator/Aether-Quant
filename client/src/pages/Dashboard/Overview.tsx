import { useEffect, useState, useRef, useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Shield, Zap, Bot, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { MarketData, Candle, PortfolioSummary, TradeSignal } from "@shared/types";
import { usePageTitle } from "@/lib/usePageTitle";
import { api, createWebSocket } from "@/lib/api";
import { useWalletContext } from "@/contexts/WalletContext";
import { useAgentContext } from "@/contexts/AgentContext";

const defaultPortfolio: PortfolioSummary = {
  totalValue: 284730.50,
  totalPnl: 12450.80,
  pnlPercent: 4.57,
  openPositions: 6,
  availableBalance: 45200.00,
  allocation: [
    { asset: "WTI", value: 85000, percentage: 29.8, pnl: 3400 },
    { asset: "BRENT", value: 72000, percentage: 25.3, pnl: -1200 },
    { asset: "NGAS", value: 45000, percentage: 15.8, pnl: 5600 },
    { asset: "GASOL", value: 38000, percentage: 13.4, pnl: 2100 },
    { asset: "BHEL", value: 44530, percentage: 15.6, pnl: 2550 },
  ],
};

const PIE_COLORS = ["#E8A020", "#3B82F6", "#22C55E", "#EF4444", "#8B5CF6"];

const recentActivity = [
  { time: "14:32", action: "Long 1,000 WTI @ $78.43", type: "trade" },
  { time: "14:28", action: "Signal: WTI momentum bullish (78% conf)", type: "signal" },
  { time: "14:15", action: "BRENT stop-loss updated to $79.50", type: "alert" },
  { time: "13:45", action: "Portfolio rebalance: +2% NGAS allocation", type: "trade" },
  { time: "13:22", action: "Risk check passed — all positions within limits", type: "alert" },
  { time: "12:58", action: "OPEC report received — analyzing impact", type: "system" },
];

function StatCard({ icon: Icon, label, value, change, prefix = "" }: {
  icon: any; label: string; value: string; change?: string; prefix?: string;
}) {
  const isPositive = change?.startsWith("+");
  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-amber" />
      </div>
      <div className="text-2xl font-display font-bold">{prefix}{value}</div>
      {change && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
  );
}

export default function Overview() {
  usePageTitle("Dashboard");
  const [quotes, setQuotes] = useState<MarketData[]>([]);
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [portfolio] = useState<PortfolioSummary>(defaultPortfolio);
  const [timeframe, setTimeframe] = useState("1H");
  const wsRef = useRef<WebSocket | null>(null);
  const { connected } = useWalletContext();
  const { agents } = useAgentContext();

  const runningAgents = useMemo(() => agents.filter((a) => a.status === "running").length, [agents]);
  const activeSignals = useMemo(() => signals.filter((s) => !s.acknowledged).length, [signals]);

  useEffect(() => {
    api.market.quotes().then(setQuotes).catch(() => {});
    api.market.history("WTI", "1h", 50).then(setChartData).catch(() => {});
    api.agents.signals().then((d) => setSignals(d.signals)).catch(() => {});

    const ws = createWebSocket();
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "market") setQuotes(data.payload);
      } catch {}
    };

    const signalInterval = setInterval(() => {
      api.agents.signals().then((d) => setSignals(d.signals)).catch(() => {});
    }, 30000);

    return () => { ws.close(); clearInterval(signalInterval); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time portfolio overview and market intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/30 text-[10px] text-muted-foreground font-mono">
            <Bot className="w-3 h-3 text-amber" />
            {runningAgents}/{agents.length} agents
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/30 text-[10px] text-muted-foreground font-mono">
            <Zap className="w-3 h-3 text-amber" />
            {activeSignals} signals
          </div>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500"}`} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total Value" value={`$${portfolio.totalValue.toLocaleString()}`} change={`+${portfolio.pnlPercent.toFixed(2)}%`} />
        <StatCard icon={Activity} label="P&L (24h)" value={`$${portfolio.totalPnl.toLocaleString()}`} change={`+${portfolio.pnlPercent.toFixed(2)}%`} />
        <StatCard icon={BarChart3} label="Open Positions" value={String(portfolio.openPositions)} />
        <StatCard icon={Shield} label="Available" value={`$${portfolio.availableBalance.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">WTI Crude — Price Chart</h2>
            <div className="flex gap-2">
              {["1H", "4H", "1D", "1W"].map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${timeframe === tf ? "bg-amber text-black font-semibold" : "bg-accent/50 text-muted-foreground hover:text-foreground"}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0} />
                </linearGradient></defs>
                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip contentStyle={{ background: "oklch(0.15 0.009 260)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: "8px", fontSize: "12px" }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]} />
                <Area type="monotone" dataKey="close" stroke="oklch(0.72 0.18 60)" strokeWidth={2} fill="url(#priceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Market Overview</h2>
            <div className="space-y-2">
              {quotes.map((q) => (
                <div key={q.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium font-mono">{q.symbol}</div>
                    <div className="text-[10px] text-muted-foreground">Vol: {(q.volume24h / 1000).toFixed(0)}K</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-medium">${q.price.toFixed(2)}</div>
                    <div className={`text-[10px] font-medium ${q.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {q.change24h >= 0 ? "+" : ""}{q.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Activity Feed</h2>
            <div className="space-y-2">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="text-muted-foreground font-mono shrink-0 w-10">{a.time}</span>
                  <span className={`${a.type === "trade" ? "text-green-500" : a.type === "signal" ? "text-amber" : "text-muted-foreground"}`}>
                    {a.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Portfolio Allocation</h2>
          <div className="flex items-center gap-8">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={portfolio.allocation} dataKey="value" nameKey="asset" cx="50%" cy="50%" innerRadius={35} outerRadius={65} stroke="none">
                    {portfolio.allocation.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {portfolio.allocation.map((a, i) => (
                <div key={a.asset} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs font-mono w-12">{a.asset}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-accent/50 overflow-hidden">
                    <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${a.percentage}%` }} />
                  </div>
                  <span className="text-xs font-mono w-16 text-right">{a.percentage.toFixed(1)}%</span>
                  <span className={`text-xs font-mono w-20 text-right ${a.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {a.pnl >= 0 ? "+" : ""}${a.pnl.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Active Signals</h2>
          {signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Zap className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">No active signals</p>
              <p className="text-[10px] mt-1">Signals update every 60 seconds</p>
            </div>
          ) : (
            <div className="space-y-2">
              {signals.slice(0, 5).map((s) => (
                <div key={s.id} className="p-3 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold">{s.symbol}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${s.direction === "long" ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                      {s.direction.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{s.strategy}</span>
                    <span className="ml-auto text-[10px] font-mono">{(s.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
