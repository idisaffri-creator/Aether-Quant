import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, TrendingUp, Bot } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { equityCurveData, agentsData, dailyPnlData, dashboardMetrics } from "@/lib/mockData";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

function useAnimatedCounter(end: number, duration = 2000, inView = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    let frame: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, end, duration]);
  return value;
}

/* ---- Mini sparkline for the hero dashboard ---- */
function MiniChart({ data, color, height = 180 }: { data: { date: string; equity: number }[]; color: string; height?: number }) {
  const trimmed = data.slice(-60);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={trimmed} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{ background: "rgba(10,10,14,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f8fafc", fontSize: 11 }}
          formatter={(v: number) => [`$${(v / 1000).toFixed(1)}k`, "Equity"]}
          labelFormatter={() => ""}
        />
        <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2} fill="url(#heroGrad)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---- Mini bar chart for daily P&L ---- */
function PnLBarChart({ data, height = 100 }: { data: { date: string; pnl: number }[]; height?: number }) {
  const trimmed = data.slice(-20);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={trimmed} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
          {trimmed.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? "oklch(0.78 0.19 160)" : "oklch(0.65 0.22 20)"} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---- Agent status dots ---- */
function AgentDots() {
  const running = agentsData.filter((a) => a.status === "running");
  return (
    <div className="flex items-center gap-2">
      {running.slice(0, 4).map((a, i) => (
        <div key={a.id} className="relative group">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-sm cursor-default">
            {a.avatar}
          </div>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-popover/95 backdrop-blur-md border border-white/10 text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {a.name} · {a.status}
          </div>
        </div>
      ))}
      <div className="text-[10px] text-muted-foreground font-mono">+{running.length - 4} agents</div>
    </div>
  );
}

export default function HeroSection() {
  const [hovered, setHovered] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-50px" });
  const pnlCounter = useAnimatedCounter(dashboardMetrics.totalPnl / 1000, 2200, inView);

  return (
    <section ref={sectionRef} className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden pt-28 pb-20">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 blur-[140px] rounded-[100%]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full translate-y-1/2 translate-x-1/4" />
        <div className="absolute inset-0 grid-bg opacity-20 mask-image:linear-gradient(to_bottom,black 30%,transparent 100%)" />
      </div>

      <div className="container relative z-10">
        {/* ===== TOP: Hero Text + Dashboard Preview (split layout on lg+) ===== */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center mb-20">
          {/* LEFT — Copy */}
          <motion.div variants={containerVariants} initial="hidden" animate={inView ? "visible" : "hidden"} className="flex flex-col">
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 mb-8 backdrop-blur-md w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-foreground/80 text-[11px] font-sans font-medium tracking-wide uppercase">
                Aether Network v3.0 · Live
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={itemVariants} className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-bold text-foreground leading-[1.08] tracking-tight mb-6">
              The modern standard for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                energy trading.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p variants={itemVariants} className="text-muted-foreground text-lg leading-relaxed max-w-lg mb-10 font-sans">
              Deploy autonomous AI agents that trade crude, gold, and natgas around the clock. Institutional quant tools — no fund, no team, no six-figure terminal required.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-8">
             <Link href="/register" className="w-full sm:w-auto relative group">
                <div className="absolute -inset-1 bg-primary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Button className="w-full sm:w-auto relative btn-amber px-8 py-6 text-base rounded-full group cursor-pointer shadow-lg shadow-primary/20">
                  Launch Platform
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => document.querySelector("#terminal")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto px-8 py-6 text-base rounded-full border-white/10 bg-white/5 text-foreground hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
              >
                Explore Features
              </Button>
            </motion.div>

            {/* Live metric strip */}
            <motion.div variants={itemVariants} className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-mono text-muted-foreground">
                  <span className="text-foreground font-semibold">${pnlCounter.toFixed(0)}k</span> total P&L
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">{dashboardMetrics.avgSharpe}</span> avg Sharpe
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <AgentDots />
            </motion.div>
          </motion.div>

          {/* RIGHT — Live Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40, y: 20 }}
            animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="perspective-[2000px] w-full max-w-lg mx-auto lg:max-w-none lg:mx-0"
          >
            <motion.div
              animate={{ rotateX: hovered ? 0 : 3, scale: hovered ? 1.01 : 1, translateY: hovered ? -6 : 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur-2xl shadow-2xl shadow-primary/10 overflow-hidden transform-gpu"
            >
              {/* Window chrome */}
              <div className="h-10 border-b border-white/8 bg-white/[0.02] flex items-center px-4 gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-muted-foreground font-mono">
                    dashboard.aether.energy
                  </div>
                </div>
              </div>

              {/* Dashboard body */}
              <div className="p-4 space-y-4">
                {/* Top metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Total P&L", value: `$${(dashboardMetrics.totalPnl / 1000).toFixed(1)}k`, change: `+${dashboardMetrics.ytdReturn}%`, up: true },
                    { label: "Active Agents", value: String(dashboardMetrics.activeAgents), change: "All online", up: true },
                    { label: "Win Rate", value: "68.3%", change: "+2.1% this week", up: true },
                  ].map((m) => (
                    <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</div>
                      <div className="text-lg font-display font-bold text-foreground">{m.value}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${m.up ? "text-emerald-400" : "text-red-400"}`}>{m.change}</div>
                    </div>
                  ))}
                </div>

                {/* Equity curve chart */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">Portfolio Equity Curve</span>
                    <span className="text-[10px] text-emerald-400 font-mono">+{dashboardMetrics.ytdReturn}% YTD</span>
                  </div>
                  <MiniChart data={equityCurveData} color="#f59e0b" height={140} />
                </div>

                {/* Bottom row: PnL bars + Agent list */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Daily P&L (20d)</div>
                    <PnLBarChart data={dailyPnlData} height={70} />
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Agent Fleet</div>
                    {agentsData.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{a.avatar}</span>
                          <span className="text-[10px] text-foreground/70 font-medium truncate max-w-[80px]">{a.name.split(" ")[0]}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${a.dailyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {a.dailyPnl >= 0 ? "+" : ""}${(a.dailyPnl / 1000).toFixed(1)}k
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Bottom glow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/15 blur-[50px] rounded-full pointer-events-none" />
          </motion.div>
        </div>

        {/* ===== BOTTOM: Trust strip ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col items-center"
        >
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-sans font-medium mb-5">
            Trusted by energy traders worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-40">
            {["CME Group", "ICE", "Polygon.io", "Interactive Brokers", "Bloomberg"].map((name) => (
              <span key={name} className="text-sm font-display font-bold text-foreground/80 tracking-tight select-none">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
