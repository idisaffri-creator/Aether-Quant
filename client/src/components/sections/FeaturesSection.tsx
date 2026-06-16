/* ============================================================
   AETHER ENERGY — Features Section (Bento Grid Redesign)
   Asymmetric bento layout with mini interactive visuals
   ============================================================ */
import { useRef } from "react";
import {
  Cpu, TrendingUp, BarChart2, Globe, Lock, Zap,
  BookOpen, Users, RefreshCw, ArrowUpRight, Sparkles,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer,
} from "recharts";

/* Mini sparkline for feature cards */
function MiniSpark({ data, color = "#f59e0b" }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ t: i, v }));
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace("#", "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const sparkData = {
  momentum: [42, 45, 43, 48, 52, 50, 55, 58, 62, 60, 65, 68, 72, 70, 75],
  volatility: [30, 45, 25, 50, 20, 55, 15, 60, 35, 40, 28, 48, 32, 52, 38],
  spread: [50, 52, 48, 55, 53, 58, 56, 60, 62, 59, 63, 65, 64, 68, 70],
  risk: [80, 75, 70, 65, 60, 55, 50, 45, 42, 40, 38, 35, 33, 30, 28],
};

const features = [
  {
    icon: Cpu,
    title: "Visual Quant Strategy Builder",
    description:
      "Drag, connect, deploy. Build algorithmic strategies by wiring signal blocks, risk gates, and execution triggers on a visual canvas.",
    highlight: true,
    size: "large" as const,
    spark: sparkData.momentum,
    sparkColor: "#f59e0b",
    tag: "CORE FEATURE",
  },
  {
    icon: TrendingUp,
    title: "Regime-Adaptive AI",
    description:
      "Auto-tunes parameters when market regimes shift — contango to backwardation, low to high vol.",
    highlight: false,
    size: "normal" as const,
    spark: sparkData.momentum,
    sparkColor: "#34d399",
    tag: "AI-POWERED",
  },
  {
    icon: BarChart2,
    title: "Institutional Backtesting",
    description:
      "Test against a decade of WTI/Brent tick data with realistic slippage and commission stacking.",
    highlight: false,
    size: "normal" as const,
    spark: sparkData.spread,
    sparkColor: "#60a5fa",
    tag: null,
  },
  {
    icon: Globe,
    title: "Crude-First Market Data",
    description:
      "Live WTI/Brent ticks, EIA inventory surprises, OPEC+ decision scoring, and refining margin data.",
    highlight: false,
    size: "wide" as const,
    spark: sparkData.volatility,
    sparkColor: "#a78bfa",
    tag: "ENERGY FOCUS",
  },
  {
    icon: Lock,
    title: "Prop-Desk Risk Controls",
    description:
      "Pre-trade VaR, dynamic position sizing, correlation-aware exposure caps, and automatic circuit breakers.",
    highlight: false,
    size: "normal" as const,
    spark: sparkData.risk,
    sparkColor: "#f87171",
    tag: null,
  },
  {
    icon: Zap,
    title: "Paper Trading With Market Replay",
    description:
      "Validate strategies against historical data replay that mimics live fills, slippage, and liquidity.",
    highlight: false,
    size: "normal" as const,
    spark: sparkData.momentum,
    sparkColor: "#fbbf24",
    tag: null,
  },
  {
    icon: BookOpen,
    title: "50+ Quant Templates",
    description:
      "Production-calibrated templates for mean reversion, momentum, calendar spreads, volatility arb, and news-sentiment strategies.",
    highlight: false,
    size: "wide" as const,
    spark: sparkData.spread,
    sparkColor: "#34d399",
    tag: null,
  },
  {
    icon: Users,
    title: "Multi-User RBAC",
    description:
      "Admin, trader, analyst, and viewer roles with granular permissions per strategy and instrument.",
    highlight: false,
    size: "normal" as const,
    spark: null,
    sparkColor: undefined,
    tag: null,
  },
  {
    icon: RefreshCw,
    title: "Multi-Broker Execution",
    description:
      "Connect IBKR, Eurex, ICE, and CME. Smart order routing, position aggregation, and execution quality analytics.",
    highlight: false,
    size: "normal" as const,
    spark: null,
    sparkColor: undefined,
    tag: null,
  },
];

function FeatureCard({ feature, index, inView }: { feature: typeof features[0]; index: number; inView: boolean }) {
  const Icon = feature.icon;
  const isLarge = feature.size === "large";
  const isWide = feature.size === "wide";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`group glass-card rounded-2xl p-6 border transition-all duration-500 hover:border-primary/25 hover:bg-[oklch(0.18_0.012_260/80%)] cursor-default relative overflow-hidden ${
        isLarge ? "md:col-span-2 md:row-span-2" : ""
      } ${isWide ? "md:col-span-2" : ""} ${
        feature.highlight
          ? "border-primary/25 bg-[oklch(0.16_0.012_260/90%)]"
          : "border-white/8"
      }`}
    >
      {/* Hover glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
            feature.highlight
              ? "bg-primary/20 group-hover:bg-primary/30"
              : "bg-white/8 group-hover:bg-primary/15"
          }`}>
            <Icon className={`w-5 h-5 transition-colors duration-300 ${
              feature.highlight ? "text-primary" : "text-white/60 group-hover:text-primary"
            }`} />
          </div>
          {feature.tag && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/8">
              <Sparkles className="w-2.5 h-2.5 text-primary/60" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold">{feature.tag}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className={`font-display font-bold text-foreground mb-2 leading-snug ${
          isLarge ? "text-xl lg:text-2xl" : "text-base"
        }`}>
          {feature.title}
        </h3>
        <p className={`text-muted-foreground leading-relaxed mb-4 ${
          isLarge ? "text-sm" : "text-[13px]"
        }`}>
          {feature.description}
        </p>

        {/* Sparkline */}
        {feature.spark && (
          <div className="mt-auto">
            <MiniSpark data={feature.spark} color={feature.sparkColor} />
          </div>
        )}

        {/* Large card extras */}
        {isLarge && (
          <div className="mt-4 flex items-center gap-2 text-primary text-xs font-medium cursor-pointer group/link">
            <span className="group-hover/link:underline">Explore strategy builder</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-24 lg:py-32 relative" ref={ref}>
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <div className="section-number mb-3">03 — Features</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            Built for{" "}
            <span className="text-primary">Oil Traders</span>
            , Not Equities
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Every feature is designed around the specific demands of crude oil
            markets — contango curves, EIA surprises, OPEC shocks, and the
            geopolitical events that move spreads.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
