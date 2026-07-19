/*
 * Aether Energy — Dashboard v5
 * Live data: portfolio analytics, leaderboard, notifications, data feeds, orders
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePageTitle } from "@/lib/usePageTitle";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { api } from "@/lib/api";
import { Link, useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, Wallet, Activity, Users, Trophy, BarChart3, Bell,
  Target, Shield, Zap, Database, Radio, ArrowUpRight, ArrowDownRight, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, FileText, Sparkles, Send, Gauge, Lightbulb,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { formatDistanceToNow } from "@/lib/dateUtils";

const TICKER_SYMBOLS: Array<{ symbol: string; label: string }> = [
  { symbol: "WTI", label: "WTI" },
  { symbol: "BRENT", label: "Brent" },
  { symbol: "GASOL", label: "Gasoline" },
  { symbol: "HEATOIL", label: "Diesel" },
  { symbol: "NGAS", label: "LNG (Nat Gas)" },
];

interface Portfolio {
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
    bestTrade: { symbol: string; pnl: number; date: string } | null;
    worstTrade: { symbol: string; pnl: number; date: string } | null;
  };
  perSymbol: Array<{ symbol: string; pnl: number; trades: number; quantity: number }>;
}

interface FeedStatus {
  available: boolean;
  feeds: Array<{ name: string; healthy: boolean; latencyMs?: number; configured?: boolean }>;
  lastRun: { quotes?: string; eia?: string; news?: string; signals?: string };
}

interface LeaderboardMe {
  rank: number;
  totalUsers: number;
  totalPnl: number;
}

export default function Dashboard() {
  usePageTitle("Dashboard");
  const [token] = useAtom(tokenAtom);
  const [, setLocation] = useLocation();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [feed, setFeed] = useState<FeedStatus | null>(null);
  const [me, setMe] = useState<LeaderboardMe | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, { price: number; change24h: number }>>({});
  const [roster, setRoster] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [askInput, setAskInput] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [p, d, lb, n, o, q, a] = await Promise.all([
        fetch("/api/portfolio/analytics", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
        fetch("/api/data/status").then(r => r.json()),
        fetch("/api/leaderboard/me", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
        fetch("/api/notifications?limit=5", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { notifications: [] }),
        fetch("/api/trading/orders?limit=5", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { orders: [] }),
        api.market.quotes().catch(() => []),
        api.agents.status().catch(() => ({ agents: [] })),
      ]);
      setPortfolio(p);
      setFeed(d);
      setMe(lb);
      setNotifications(n.notifications || []);
      setRecentOrders(o.orders || []);
      const byKey: Record<string, { price: number; change24h: number }> = {};
      for (const quote of q as any[]) byKey[quote.symbol] = { price: quote.price, change24h: quote.change24h };
      setQuotes(byKey);
      setRoster((a.agents || []).map((ag: any) => ({ id: ag.id, name: ag.name, status: ag.status })));
    } catch (err) {
      console.error("dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function askAether(e: React.FormEvent) {
    e.preventDefault();
    const q = askInput.trim();
    if (!q) return;
    setLocation(`/dashboard/ai?q=${encodeURIComponent(q)}`);
  }

  const insights: string[] = portfolio ? [
    `Sharpe ratio is ${Number(portfolio.metrics?.sharpeRatio || 0).toFixed(2)} with max drawdown of ${(Number(portfolio.metrics?.maxDrawdownPct || 0) * 100).toFixed(1)}%.`,
    `Win rate stands at ${(Number(portfolio.metrics?.winRate || 0) * 100).toFixed(1)}% across ${portfolio.totalTrades} trades.`,
    feed?.available ? `${feed.feeds?.filter(f => f.healthy).length || 0}/${feed.feeds?.length || 0} data feeds are healthy.` : "Some data feeds are degraded — signals may lag.",
    roster.length ? `${roster.filter(r => r.status === "running").length}/${roster.length} roster agents are actively running.` : "Agent roster is idle.",
  ] : [];

  if (loading || !portfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalReturnPct = portfolio.totalPnlPct;
  const isPositive = totalReturnPct >= 0;
  const allocationData = portfolio.perSymbol
    .filter(s => s.quantity > 0)
    .map((s, i) => ({
      name: s.symbol,
      value: Math.abs(s.pnl) + Math.abs(s.quantity * 1), // weighted by position size
      pnl: s.pnl,
      color: ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"][i % 6],
    }));

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Trading Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time portfolio, market data, and platform health.
          </p>
        </div>
        {me && me.rank > 0 && (
          <Link href="/dashboard/leaderboard">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-border rounded-lg text-sm hover:border-primary/30 transition-colors cursor-pointer">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-muted-foreground">Rank</span>
              <span className="font-display font-bold text-primary">#{me.rank}</span>
              <span className="text-muted-foreground">of {me.totalUsers}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </Link>
        )}
      </div>

      {/* Today's Market ticker */}
      <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0 mr-2">Today's Market</span>
        {TICKER_SYMBOLS.map(({ symbol, label }) => {
          const q = quotes[symbol];
          const positive = (q?.change24h ?? 0) >= 0;
          return (
            <div key={symbol} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 text-xs font-mono shrink-0 mr-1">
              <span className="text-muted-foreground font-sans">{label}</span>
              <span className="text-foreground">{q ? `$${q.price.toFixed(2)}` : "—"}</span>
              {q && (
                <span className={positive ? "text-emerald-400" : "text-red-400"}>
                  {positive ? "+" : ""}{q.change24h.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Ask Aether */}
      <form onSubmit={askAether} className="glass-card rounded-xl p-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary ml-2 shrink-0" />
        <input
          value={askInput}
          onChange={(e) => setAskInput(e.target.value)}
          placeholder="Ask Aether — what should I trade today?"
          className="flex-1 bg-transparent border-none outline-none text-sm py-2"
        />
        <button type="submit" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0" aria-label="Ask Aether">
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Portfolio quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickStat label="Today's P&L" value={`${portfolio.unrealizedPnl >= 0 ? "+" : ""}$${portfolio.unrealizedPnl.toFixed(2)}`} positive={portfolio.unrealizedPnl >= 0} />
        <QuickStat label="Open Risk" value={`$${portfolio.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <QuickStat label="VaR (95%, 1d)" value={`$${(portfolio.exposure * 0.0272).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <QuickStat label="Margin Available" value={`$${Math.max(0, portfolio.paperBalance - portfolio.exposure).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>

      {/* AI Insights + Agent Workforce strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
            <Lightbulb className="w-3.5 h-3.5" /> AI Insights
          </h3>
          <ul className="space-y-2">
            {insights.map((line, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
            <Gauge className="w-3.5 h-3.5" /> Agent Workforce
          </h3>
          <div className="space-y-2">
            {roster.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.status === "running" ? "bg-emerald-500 animate-pulse" : a.status === "error" ? "bg-red-500" : "bg-zinc-600"}`} />
                <span className="flex-1 text-foreground/90">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.status}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/agents" className="text-xs text-primary hover:underline mt-3 inline-block">View Digital Trading Floor →</Link>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Equity" value={`$${portfolio.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub={`$${portfolio.paperBalance.toLocaleString()} balance`} icon={Wallet} positive />
        <MetricCard
          label="Total P&L"
          value={`${isPositive ? "+" : ""}$${portfolio.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={`${isPositive ? "+" : ""}${(Number(totalReturnPct || 0) * 100).toFixed(2)}% return`}
          icon={isPositive ? TrendingUp : TrendingDown}
          positive={isPositive}
        />
        <MetricCard
          label="Sharpe"
          value={Number(portfolio.metrics?.sharpeRatio || 0).toFixed(2)}
          sub={`Sortino ${Number(portfolio.metrics?.sortinoRatio || 0).toFixed(2)}`}
          icon={Activity}
          positive={portfolio.metrics.sharpeRatio > 0}
        />
        <MetricCard
          label="Exposure"
          value={`$${portfolio.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${(Number(portfolio.exposurePct || 0) * 100).toFixed(1)}% of equity`}
          icon={Target}
          positive={false}
        />
      </div>

      {/* Live data + market */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Data feed health */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Data Feeds
            </h3>
            {feed?.available ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
          </div>
          {feed?.feeds?.length ? (
            <div className="space-y-2">
              {feed.feeds.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${f.healthy ? "bg-emerald-500" : f.configured === false ? "bg-zinc-600" : "bg-amber-500"} ${f.healthy ? "animate-pulse" : ""}`} />
                    <span className="text-foreground">{f.name}</span>
                  </div>
                  <span className={`text-xs font-mono ${f.healthy ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {f.healthy ? `${f.latencyMs}ms` : f.configured === false ? "off" : "degraded"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
        </div>

        {/* Risk + win rate */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
            <Shield className="w-3.5 h-3.5" /> Risk & Performance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Max DD" value={`${(Number(portfolio.metrics?.maxDrawdownPct || 0) * 100).toFixed(2)}%`} sub={`$${Math.abs(Number(portfolio.metrics?.maxDrawdown || 0)).toFixed(0)}`} negative />
            <Stat label="Win Rate" value={`${(Number(portfolio.metrics?.winRate || 0) * 100).toFixed(1)}%`} positive={Number(portfolio.metrics?.winRate || 0) > 0.5} />
            <Stat label="Trades" value={String(portfolio.totalTrades ?? 0)} />
            <Stat label="Realized" value={`${Number(portfolio.realizedPnl || 0) >= 0 ? "+" : ""}$${Number(portfolio.realizedPnl || 0).toFixed(2)}`} positive={Number(portfolio.realizedPnl || 0) >= 0} />
          </div>
          {portfolio.metrics?.bestTrade && (
            <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <div>Best: <span className="text-emerald-400 font-mono">+${Number(portfolio.metrics.bestTrade.pnl || 0).toFixed(2)}</span> ({portfolio.metrics.bestTrade.symbol})</div>
              {portfolio.metrics.worstTrade && (
                <div>Worst: <span className="text-red-400 font-mono">${Number(portfolio.metrics.worstTrade.pnl || 0).toFixed(2)}</span> ({portfolio.metrics.worstTrade.symbol})</div>
              )}
            </div>
          )}
        </div>

        {/* Allocation pie */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
            <BarChart3 className="w-3.5 h-3.5" /> Allocation
          </h3>
          {allocationData.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                    {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">No positions</div>
          )}
          <div className="space-y-1 mt-2">
            {allocationData.length > 0 ? allocationData.slice(0, 4).map((a) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-muted-foreground">{a.name}</span>
                </div>
                <span className={`font-mono font-semibold ${Number(a.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Number(a.pnl || 0) >= 0 ? "+" : ""}${Number(a.pnl || 0).toFixed(2)}
                </span>
              </div>
            )) : <div className="text-xs text-muted-foreground">Start trading to see allocation</div>}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Recent Orders
            </h3>
            <Link href="/dashboard/trading" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30">
                  <div className={`p-1.5 rounded-lg ${o.side === "buy" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {o.side === "buy" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{o.side.toUpperCase()} {o.quantity} {o.symbol}</div>
                    <div className="text-xs text-muted-foreground">{o.status} · {o.orderType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{o.avgFillPrice ? `$${Number(o.avgFillPrice).toFixed(2)}` : "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.createdAt ? formatDistanceToNow(new Date(o.createdAt)) : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6">No orders yet</div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </h3>
            <Link href="/dashboard/notifications" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className={`p-2 rounded-lg ${!n.read ? "border-l-2 border-l-primary" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="text-xs font-medium flex-1">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">{n.createdAt && formatDistanceToNow(new Date(n.createdAt))}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6">All caught up</div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/trading">
          <QuickAction icon={Activity} label="Paper Trade" />
        </Link>
        <Link href="/dashboard/backtest">
          <QuickAction icon={BarChart3} label="Backtest" />
        </Link>
        <Link href="/dashboard/ai">
          <QuickAction icon={Sparkles} label="AI Advisor" />
        </Link>
        <Link href="/dashboard/marketplace">
          <QuickAction icon={Database} label="Marketplace" />
        </Link>
      </div>
    </motion.div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, positive }: { label: string; value: string; sub: string; icon: any; positive: boolean }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <Icon className={`w-4 h-4 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-primary"}`} />
      </div>
      <div className={`text-2xl font-display font-bold ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function QuickStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`text-lg font-display font-bold mt-0.5 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`text-sm font-mono font-bold ${negative ? "text-red-400" : positive ? "text-emerald-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/30 transition-colors cursor-pointer min-h-[80px]">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
