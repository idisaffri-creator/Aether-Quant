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
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Wallet, Activity, Users, Trophy, BarChart3, Bell,
  Target, Shield, Zap, Database, Radio, ArrowUpRight, ArrowDownRight, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, FileText, Sparkles,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { formatDistanceToNow } from "@/lib/dateUtils";

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
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [feed, setFeed] = useState<FeedStatus | null>(null);
  const [me, setMe] = useState<LeaderboardMe | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [p, d, lb, n, o] = await Promise.all([
        fetch("/api/portfolio/analytics", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
        fetch("/api/data/status").then(r => r.json()),
        fetch("/api/leaderboard/me", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
        fetch("/api/notifications?limit=5", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { notifications: [] }),
        fetch("/api/trading/orders?limit=5", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { orders: [] }),
      ]);
      setPortfolio(p);
      setFeed(d);
      setMe(lb);
      setNotifications(n.notifications || []);
      setRecentOrders(o.orders || []);
    } catch (err) {
      console.error("dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

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

      {/* Hero metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Equity" value={`$${portfolio.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub={`$${portfolio.paperBalance.toLocaleString()} balance`} icon={Wallet} positive />
        <MetricCard
          label="Total P&L"
          value={`${isPositive ? "+" : ""}$${portfolio.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={`${isPositive ? "+" : ""}${(totalReturnPct * 100).toFixed(2)}% return`}
          icon={isPositive ? TrendingUp : TrendingDown}
          positive={isPositive}
        />
        <MetricCard
          label="Sharpe"
          value={portfolio.metrics.sharpeRatio.toFixed(2)}
          sub={`Sortino ${portfolio.metrics.sortinoRatio.toFixed(2)}`}
          icon={Activity}
          positive={portfolio.metrics.sharpeRatio > 0}
        />
        <MetricCard
          label="Exposure"
          value={`$${portfolio.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${(portfolio.exposurePct * 100).toFixed(1)}% of equity`}
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
            <Stat label="Max DD" value={`${(portfolio.metrics.maxDrawdownPct * 100).toFixed(2)}%`} sub={`$${Math.abs(portfolio.metrics.maxDrawdown).toFixed(0)}`} negative />
            <Stat label="Win Rate" value={`${(portfolio.metrics.winRate * 100).toFixed(1)}%`} positive={portfolio.metrics.winRate > 0.5} />
            <Stat label="Trades" value={String(portfolio.totalTrades)} />
            <Stat label="Realized" value={`${portfolio.realizedPnl >= 0 ? "+" : ""}$${portfolio.realizedPnl.toFixed(2)}`} positive={portfolio.realizedPnl >= 0} />
          </div>
          {portfolio.metrics.bestTrade && (
            <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <div>Best: <span className="text-emerald-400 font-mono">+${portfolio.metrics.bestTrade.pnl.toFixed(2)}</span> ({portfolio.metrics.bestTrade.symbol})</div>
              {portfolio.metrics.worstTrade && (
                <div>Worst: <span className="text-red-400 font-mono">${portfolio.metrics.worstTrade.pnl.toFixed(2)}</span> ({portfolio.metrics.worstTrade.symbol})</div>
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
                <span className={`font-mono font-semibold ${a.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {a.pnl >= 0 ? "+" : ""}${a.pnl.toFixed(2)}
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
