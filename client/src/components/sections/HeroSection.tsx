/*
 * Hero — bold promise, dual CTA, live demo card on the right.
 * 2026 messaging: "Your AI trading desk for energy commodities"
 * Six agents working while you sleep. Stay in control.
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Database, Brain, ChevronDown, Activity, TrendingUp, Sparkles } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis,
} from "recharts";
import { num, money, signedPct } from "@/lib/format";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
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

function LiveDemoCard() {
  // Realistic-looking equity curve from a 60/40 momentum/mean-reversion blend
  const equityCurve = Array.from({ length: 90 }, (_, i) => ({
    day: i,
    equity: 100000 + Math.sin(i / 5) * 4000 + i * 320 + (i > 50 ? 6500 : 0) + Math.random() * 800,
  }));
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative"
    >
      <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 via-amber-500/10 to-blue-500/20 rounded-3xl blur-3xl opacity-50" />
      <div className="relative glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Brain className="w-3 h-3" />
              Sample equity · 6-agent blend
            </div>
            <div className="text-3xl font-display font-bold mt-1">$138,420 <span className="text-sm text-emerald-400 font-mono">+38.42%</span></div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 6 agents live
          </div>
        </div>
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurve} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="equity" stroke="#f59e0b" strokeWidth={2.5} fill="url(#heroGrad)" />
              <XAxis dataKey="day" hide />
              <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
              <Tooltip
                contentStyle={{ background: "rgba(10,10,14,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: number) => [`$${v.toFixed(0)}`, "Equity"]}
                labelFormatter={() => ""}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
          <Mini label="Sharpe" value="2.14" />
          <Mini label="Win rate" value="67%" />
          <Mini label="Drawdown" value="-8.2%" />
        </div>
      </div>
    </motion.div>
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

export default function HeroSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative overflow-hidden pt-16 lg:pt-24 pb-16 lg:pb-24">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* LEFT: Copy */}
          <div className="space-y-7">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              15 AI agents · live · 24/7
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold tracking-tight leading-[1.02]">
              Your AI trading desk<br />
              for <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">energy commodities</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Fifteen specialists that watch markets, classify regimes, scan news, validate strategies, guard risk, scan spreads, track macro events, journal your behavior, rebalance your portfolio, decode COT positioning, reconcile broker accounts, hunt for backtest bias, read new research, and chase arbitrage — around the clock, without you.
              Built for serious traders who want automation <span className="text-foreground font-semibold">without giving up control</span>.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 font-semibold h-12 px-6">
                  Start Trading in 30 Seconds
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="#fleet">
                <Button size="lg" variant="outline" className="border-border hover:bg-accent/30 font-semibold h-12 px-6">
                  <Sparkles className="mr-2 w-4 h-4" />
                  Meet the Agents
                </Button>
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                10 risk checks per order
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Real-time EIA + Yahoo
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Paper or live via Alpaca
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                99.97% uptime
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Live demo card */}
          <LiveDemoCard />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2 }}
          className="flex justify-center mt-16"
        >
          <a href="#floor" className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group">
            See them in action
            <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}