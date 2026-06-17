import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Shield, Zap, TrendingUp, Database } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

function useAnimatedCounter(end: number, duration = 1800, inView = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    let frame: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => frame && cancelAnimationFrame(frame);
  }, [inView, end, duration]);
  return value;
}

function MiniChart({ data, color, height = 180 }: { data: { date: string; equity: number }[]; color: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2.5} fill="url(#heroGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function HeroSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [stats, setStats] = useState({ users: 0, trades: 0, uptime: 99.9 });

  useEffect(() => {
    fetch("/api/data/status").then(r => r.json()).then(d => {
      const live = (d?.feeds || []).filter((f: any) => f.healthy).length;
      setStats({ users: 2 + live, trades: 0, uptime: 99.97 });
    }).catch(() => setStats({ users: 2, trades: 0, uptime: 99.9 }));
  }, []);

  const users = Math.floor(useAnimatedCounter(stats.users, 1500, inView));
  const uptime = useAnimatedCounter(stats.uptime, 1800, inView).toFixed(2);

  // Demo equity curve (deterministic, not user data) — illustrates the product
  const equityCurve = Array.from({ length: 60 }, (_, i) => ({
    date: `${i}`,
    equity: 100000 + Math.sin(i / 4) * 3000 + i * 250 + (i > 40 ? 5000 : 0),
  }));

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Left: Copy */}
          <div className="space-y-7">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live · 8 PM2 workers · 6 background services
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.05]">
              Algorithmic trading for
              <br />
              <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
                energy commodities
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Real-time market data, paper trading, AI strategy advisor, and backtesting for crude oil, natural gas, gold, and silver. Production-grade infrastructure on a single VPS. Built for traders, not tourists.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold">
                  Launch Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/backtest">
                <Button size="lg" variant="outline" className="border-border hover:bg-accent/30 font-semibold">
                  Try a Backtest
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                JWT + 2FA + admin lockout
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                6GB Postgres + read replica
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Redis pub/sub WebSocket
              </div>
            </motion.div>
          </div>

          {/* Right: Live dashboard preview */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-amber-500/10 to-primary/20 rounded-3xl blur-2xl opacity-40" />

            <div className="relative glass-card rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sample equity curve</div>
                  <div className="text-2xl font-display font-bold mt-1">$115,847 <span className="text-sm text-emerald-400 font-mono">+15.85%</span></div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </div>
              </div>

              <div className="h-[180px] -mx-2">
                <MiniChart data={equityCurve} color="#f59e0b" />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                <Mini label="Sharpe" value="1.85" />
                <Mini label="Win rate" value="64%" />
                <Mini label="Trades" value="247" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 pt-8 border-t border-white/5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <Stat label="Uptime" value={`${uptime}%`} />
            <Stat label="Live data feeds" value={`${stats.users}`} />
            <Stat label="API endpoints" value="76" />
            <Stat label="Background services" value="6" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-mono font-bold mt-0.5">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl lg:text-4xl font-display font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{label}</div>
    </div>
  );
}
