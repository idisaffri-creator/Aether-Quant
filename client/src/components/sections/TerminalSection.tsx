import { useState, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
} from "recharts";
import {
  Activity, TrendingUp, BarChart2, Shield, Zap,
  Clock, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const T = {
  border: "rgba(255, 255, 255, 0.08)",
  textSec: "#94a3b8",
  amber: "#f59e0b",
  green: "#34d399",
  red: "#f87171",
};

const OIL_MARKETS = [
  { id: "WTI CRUDE", region: "US", value: 78.42, change: 0.72, pctChange: 0.92, vol: 24.5, ytd: 4.2 },
  { id: "BRENT", region: "UK", value: 82.15, change: 0.58, pctChange: 0.71, vol: 22.1, ytd: 3.8 },
  { id: "NAT GAS", region: "US", value: 2.84, change: -1.23, pctChange: -2.1, vol: 45.2, ytd: -12.4 },
  { id: "GASOLINE", region: "US", value: 2.41, change: -0.18, pctChange: -0.5, vol: 28.4, ytd: 2.1 },
  { id: "GOLD", region: "US", value: 2048.30, change: -3.68, pctChange: -0.18, vol: 14.2, ytd: 8.6 },
  { id: "SILVER", region: "US", value: 24.15, change: 0.32, pctChange: 1.34, vol: 32.8, ytd: 5.2 },
];

const genAreaData = (seed: number, base: number, pts = 40) => {
  let v = base;
  return Array.from({ length: pts }, (_, i) => {
    v += (Math.sin(i * 0.5 + seed) * base * 0.02) + (Math.random() - 0.5) * base * 0.01;
    return { t: i, v };
  });
};

/* Volatility surface data */
const volSurface = Array.from({ length: 12 }, (_, i) => ({
  tenor: ["1M", "2M", "3M", "6M", "9M", "1Y", "18M", "2Y", "3Y", "4Y", "5Y", "10Y"][i],
  iv: +(22 + Math.sin(i * 0.8) * 8 + Math.random() * 3).toFixed(1),
  hv: +(20 + Math.cos(i * 0.6) * 6 + Math.random() * 2).toFixed(1),
}));

/* Correlation matrix data */
const corrAssets = ["CL", "BZ", "NG", "GC", "SI", "HG"];
const corrMatrix = corrAssets.map((a, i) =>
  corrAssets.map((b, j) => {
    if (i === j) return 1;
    if (i < j) {
      const base = a === "CL" && b === "BZ" ? 0.92 : a === "CL" && b === "NG" ? 0.45 : a === "GC" && b === "SI" ? 0.82 : 0.2 + Math.random() * 0.3;
      return +base.toFixed(2);
    }
    return 0;
  })
);

/* Order book data */
const orderBook = {
  bids: Array.from({ length: 8 }, (_, i) => ({
    price: 78.42 - (i + 1) * 0.03,
    size: Math.round(50 + Math.random() * 200),
    total: 0,
  })).map((b, i, arr) => {
    const total = arr.slice(0, i + 1).reduce((s, x) => s + x.size, 0);
    return { ...b, total };
  }),
  asks: Array.from({ length: 8 }, (_, i) => ({
    price: 78.45 + i * 0.03,
    size: Math.round(50 + Math.random() * 200),
    total: 0,
  })).map((a, i, arr) => {
    const total = arr.slice(0, i + 1).reduce((s, x) => s + x.size, 0);
    return { ...a, total };
  }),
};

type View = "overview" | "analytics" | "execution";

export default function TerminalSection() {
  const [view, setView] = useState<View>("overview");
  const sectionRef = useRef<HTMLDivElement>(null);
  const selected = OIL_MARKETS[0];
  const chartData = genAreaData(42, selected.value, 40);

  return (
    <section ref={sectionRef} id="terminal" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-primary text-[11px] font-sans font-bold tracking-wider uppercase">
              Institutional Infrastructure
            </span>
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            The next generation of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              quant execution.
            </span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed font-sans">
            Leave the clunky terminals behind. Experience a beautifully unified, glassmorphic interface that brings algorithmic clarity to complex energy markets.
          </p>
        </motion.div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="rounded-2xl overflow-hidden border border-white/10 bg-background/40 backdrop-blur-2xl shadow-2xl shadow-black/80 max-w-6xl mx-auto"
        >
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-6 mb-4 sm:mb-0 overflow-x-auto no-scrollbar">
              {([
                { key: "overview", label: "Market Overview", icon: Activity },
                { key: "analytics", label: "Deep Analytics", icon: BarChart2 },
                { key: "execution", label: "Execution Engine", icon: Zap },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const active = view === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key)}
                    className={`flex items-center gap-2 pb-1 transition-all border-b-2 font-sans text-sm font-medium whitespace-nowrap ${
                      active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                System Online
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 min-h-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* ===== OVERVIEW TAB ===== */}
                {view === "overview" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-3">
                      <h3 className="text-sm font-sans font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Global Benchmarks
                      </h3>
                      <div className="space-y-2">
                        {OIL_MARKETS.map((market) => (
                          <div key={market.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group cursor-pointer">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{market.id}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{market.region}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-mono text-foreground">${market.value.toFixed(2)}</div>
                                <div className={`text-xs font-mono font-medium ${market.pctChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {market.pctChange >= 0 ? "+" : ""}{market.pctChange}%
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col">
                      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex-1 flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
                          <div>
                            <h3 className="text-xl font-display font-bold text-foreground">{selected.id}</h3>
                            <p className="text-sm text-muted-foreground font-sans mt-1">Real-time composite pricing</p>
                          </div>
                          <div className="sm:text-right">
                            <div className="text-2xl sm:text-3xl font-display font-bold text-foreground">${selected.value.toFixed(2)}</div>
                            <div className="text-emerald-400 font-mono text-sm">+0.92% Today</div>
                          </div>
                        </div>
                        <div className="flex-1 min-h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={T.amber} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={T.amber} stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                              <XAxis dataKey="t" hide />
                              <YAxis tick={{ fontSize: 10, fill: T.textSec }} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                              <Tooltip
                                contentStyle={{ background: "rgba(10,10,14,0.9)", border: `1px solid ${T.border}`, borderRadius: "8px", color: "#f8fafc" }}
                                itemStyle={{ color: T.amber }}
                                formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
                                labelFormatter={() => ""}
                              />
                              <Area type="monotone" dataKey="v" stroke={T.amber} strokeWidth={2.5} fill="url(#glowGrad)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== ANALYTICS TAB ===== */}
                {view === "analytics" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Volatility Surface */}
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                      <h3 className="text-sm font-sans font-semibold text-foreground mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Volatility Surface
                      </h3>
                      <p className="text-[11px] text-muted-foreground mb-4">Implied vs Historical Volatility by Tenor</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={volSurface} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                          <XAxis dataKey="tenor" tick={{ fontSize: 10, fill: T.textSec }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: T.textSec }} tickLine={false} axisLine={false} domain={[10, 35]} />
                          <Tooltip contentStyle={{ background: "rgba(10,10,14,0.9)", border: `1px solid ${T.border}`, borderRadius: "8px", color: "#f8fafc", fontSize: 11 }} />
                          <Bar dataKey="iv" fill="#f59e0b" fillOpacity={0.7} radius={[2, 2, 0, 0]} name="Implied Vol" />
                          <Bar dataKey="hv" fill="#60a5fa" fillOpacity={0.5} radius={[2, 2, 0, 0]} name="Historical Vol" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500/70" /><span className="text-[10px] text-muted-foreground">Implied Vol</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400/50" /><span className="text-[10px] text-muted-foreground">Historical Vol</span></div>
                      </div>
                    </div>

                    {/* Correlation Matrix */}
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                      <h3 className="text-sm font-sans font-semibold text-foreground mb-1 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-blue-400" /> Cross-Asset Correlation
                      </h3>
                      <p className="text-[11px] text-muted-foreground mb-4">30-day rolling correlation matrix</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr>
                              <th className="p-2 text-left text-muted-foreground font-mono"></th>
                              {corrAssets.map((a) => (
                                <th key={a} className="p-2 text-center text-muted-foreground font-mono font-bold">{a}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {corrAssets.map((a, i) => (
                              <tr key={a}>
                                <td className="p-2 text-muted-foreground font-mono font-bold">{a}</td>
                                {corrAssets.map((b, j) => {
                                  const val = i <= j ? corrMatrix[i][j] : corrMatrix[j][i];
                                  const intensity = Math.abs(val);
                                  const bg = val === 1
                                    ? "bg-primary/20 text-primary"
                                    : val > 0.7
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : val > 0.4
                                    ? "bg-blue-500/15 text-blue-400"
                                    : "bg-white/5 text-muted-foreground";
                                  return (
                                    <td key={b} className={`p-2 text-center font-mono rounded ${bg}`}>
                                      {val.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Regime Detection */}
                    <div className="lg:col-span-2 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                      <h3 className="text-sm font-sans font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" /> Market Regime Detection
                      </h3>
                      <p className="text-[11px] text-muted-foreground mb-4">AI-driven regime classification with confidence scores</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { regime: "Low Vol Trend", confidence: 82, icon: "📊", assets: "CL, BZ", color: "text-emerald-400" },
                          { regime: "High Vol Range", confidence: 67, icon: "⚡", assets: "NG", color: "text-amber-400" },
                          { regime: "Risk-Off", confidence: 45, icon: "🛡️", assets: "GC, SI", color: "text-blue-400" },
                          { regime: "Mean Revert", confidence: 71, icon: "🔄", assets: "HG, ZW", color: "text-purple-400" },
                        ].map((r) => (
                          <div key={r.regime} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                            <div className="text-lg mb-1">{r.icon}</div>
                            <div className="text-xs font-semibold text-foreground mb-1">{r.regime}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className={`h-full rounded-full ${r.color === "text-emerald-400" ? "bg-emerald-500" : r.color === "text-amber-400" ? "bg-amber-500" : r.color === "text-blue-400" ? "bg-blue-500" : "bg-purple-500"}`} style={{ width: `${r.confidence}%` }} />
                              </div>
                              <span className={`text-[10px] font-mono font-bold ${r.color}`}>{r.confidence}%</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground mt-1.5 font-mono">{r.assets}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== EXECUTION TAB ===== */}
                {view === "execution" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Book */}
                    <div className="lg:col-span-1 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                      <h3 className="text-sm font-sans font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" /> Order Book — WTI
                      </h3>
                      {/* Asks */}
                      <div className="space-y-1 mb-3">
                        {[...orderBook.asks].reverse().map((ask, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] font-mono relative">
                            <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 rounded" style={{ width: `${(ask.total / 500) * 100}%` }} />
                            <span className="text-red-400 relative z-10 w-16">${ask.price.toFixed(2)}</span>
                            <span className="text-muted-foreground relative z-10 flex-1 text-right">{ask.size}</span>
                          </div>
                        ))}
                      </div>
                      {/* Spread */}
                      <div className="flex items-center justify-between py-2 border-y border-white/5">
                        <span className="text-[11px] font-mono text-primary font-bold">${selected.value.toFixed(2)}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">Spread: $0.03</span>
                      </div>
                      {/* Bids */}
                      <div className="space-y-1 mt-3">
                        {orderBook.bids.map((bid, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] font-mono relative">
                            <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 rounded" style={{ width: `${(bid.total / 500) * 100}%` }} />
                            <span className="text-emerald-400 relative z-10 w-16">${bid.price.toFixed(2)}</span>
                            <span className="text-muted-foreground relative z-10 flex-1 text-right">{bid.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Execution Stats + Recent Fills */}
                    <div className="lg:col-span-2 space-y-5">
                      {/* Execution metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        {[
                          { label: "Avg Fill Time", value: "12ms", color: "text-emerald-400" },
                          { label: "Slippage", value: "0.2bps", color: "text-blue-400" },
                          { label: "Fill Rate", value: "99.7%", color: "text-primary" },
                          { label: "Active Venues", value: "4", color: "text-purple-400" },
                        ].map((m) => (
                          <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</div>
                            <div className={`text-lg font-display font-bold ${m.color}`}>{m.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Recent fills */}
                      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-sm font-sans font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" /> Recent Executions
                        </h3>
                        <div className="space-y-2">
                          {[
                            { time: "14:22:18", action: "SELL", symbol: "CL", price: 73.12, qty: 10, status: "filled", pnl: 1670 },
                            { time: "11:45:33", action: "BUY COVER", symbol: "GC", price: 2049.20, qty: 3, status: "filled", pnl: -2670 },
                            { time: "10:15:22", action: "BUY", symbol: "NG", price: 3.18, qty: 20, status: "filled", pnl: null },
                            { time: "09:31:02", action: "SELL SHORT", symbol: "CL", price: 73.80, qty: 8, status: "filled", pnl: null },
                            { time: "09:30:15", action: "BUY", symbol: "SI", price: 24.08, qty: 15, status: "filled", pnl: null },
                          ].map((fill, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <div className="flex items-center gap-3">
                                <div className={`w-1 h-6 rounded-full ${fill.action.includes("BUY") ? "bg-emerald-500" : "bg-red-500"}`} />
                                <div>
                                  <div className="text-xs font-mono text-foreground">{fill.action} {fill.symbol}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{fill.time}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-mono text-foreground">${fill.price.toFixed(2)} × {fill.qty}</div>
                                {fill.pnl !== null && (
                                  <div className={`text-[10px] font-mono font-bold ${fill.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {fill.pnl >= 0 ? "+" : ""}${fill.pnl.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Connected Venues */}
                      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-sm font-sans font-semibold text-foreground mb-4">Connected Venues</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { name: "Interactive Brokers", status: "connected", latency: "8ms" },
                            { name: "CME Group", status: "connected", latency: "12ms" },
                            { name: "ICE", status: "connected", latency: "15ms" },
                            { name: "Eurex", status: "standby", latency: "—" },
                          ].map((v) => (
                            <div key={v.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${v.status === "connected" ? "bg-emerald-500" : "bg-yellow-500/50"}`} />
                                <span className="text-xs font-semibold text-foreground">{v.name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">{v.latency}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
