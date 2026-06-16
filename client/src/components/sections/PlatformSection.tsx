/* ============================================================
   AETHER ENERGY — Platform Overview Section (Live Preview Redesign)
   Replace external CloudFront images with live React dashboard
   previews using real Recharts + mockData
   ============================================================ */
import { useState, useRef, type FC } from "react";
import { Layers, Brain, BarChart3, Shield, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  AreaChart, Area, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { equityCurveData, dailyPnlData, backtestMetrics } from "@/lib/mockData";

/* Mini sparkline used in previews */
function PreviewChart({ data, color, height = 160 }: { data: { date: string; equity: number }[]; color: string; height?: number }) {
  const trimmed = data.slice(-60);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={trimmed} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`plat-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{ background: "rgba(10,10,14,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f8fafc", fontSize: 11 }}
          formatter={(v: number) => [`$${(v / 1000).toFixed(1)}k`, "Equity"]}
          labelFormatter={() => ""}
        />
        <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2} fill={`url(#plat-${color.replace("#", "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PnLBars({ data, height = 80 }: { data: { date: string; pnl: number }[]; height?: number }) {
  const trimmed = data.slice(-15);
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

/* Strategy builder preview — visual node graph */
function StrategyBuilderPreview() {
  const nodes = [
    { id: "signal", label: "RSI Signal", x: 30, y: 30, color: "#f59e0b" },
    { id: "filter", label: "Vol Filter", x: 30, y: 100, color: "#60a5fa" },
    { id: "risk", label: "Risk Gate", x: 180, y: 65, color: "#f87171" },
    { id: "exec", label: "Execute", x: 330, y: 65, color: "#34d399" },
  ];
  return (
    <div className="relative h-[200px] bg-white/[0.02] rounded-xl border border-white/5 p-4 overflow-x-auto no-scrollbar">
      <div className="relative min-w-[380px] h-full">
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
        <line x1="130" y1="50" x2="200" y2="85" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 3" />
        <line x1="130" y1="120" x2="200" y2="85" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 3" />
        <line x1="260" y1="85" x2="340" y2="85" stroke="#f87171" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 3" />
      </svg>
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-medium text-foreground/80"
          style={{ left: n.x, top: n.y, borderColor: `${n.color}30` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
          {n.label}
        </div>
      ))}
      </div>
    </div>
  );
}

const tabs = [
  {
    id: "strategy",
    icon: Layers,
    label: "Strategy Builder",
    headline: "Build Quantitative Strategies Visually",
    description:
      "Design institutional-grade trading algorithms on a visual canvas — no Python, no C++, no syntax errors. Connect signal blocks, risk filters, and execution logic with drag-and-drop precision.",
    points: [
      "50+ pre-built templates calibrated for oil volatility regimes",
      "Visual conditional logic with real-time P&L preview",
      "Walk-forward optimisation to prevent overfitting",
      "Instant backtesting across 10 years of WTI/Brent data",
    ],
  },
  {
    id: "ai",
    icon: Brain,
    label: "AI Assistant",
    headline: "AI That Thinks in Greeks and Spreads",
    description:
      "Aether's quant engine pairs GPT-4 with proprietary oil-market models. Describe a strategy in plain English — 'short WTI if 3-day RSI crosses above 75' — and watch it materialise as executable logic.",
    points: [
      "Natural language strategy from plain English prompts",
      "Auto-detection of regime shifts and volatility breaks",
      "Real-time explanations for every signal trigger",
      "Continuous parameter tuning against live market data",
    ],
  },
  {
    id: "data",
    icon: BarChart3,
    label: "Market Data",
    headline: "Oil-Specific Market Intelligence",
    description:
      "Only energy traders matter here. Real-time WTI and Brent ticks, inventory surprises quantified, geopolitical risk mapped to spread volatility — surfaces that move crude, not noise.",
    points: [
      "Sub-second WTI/Brent price data via Polygon.io",
      "EIA inventory surprise vs. consensus calculator",
      "Geopolitical risk heatmap with tariff/conflict overlays",
      "Contango/backwardation regime alerts",
    ],
  },
  {
    id: "risk",
    icon: Shield,
    label: "Risk Management",
    headline: "Risk Controls Used by Commodity Desks",
    description:
      "Pre-trade risk checks, dynamic position limits, VaR-based sizing, and automatic circuit breakers. The same controls prop desks run — no manual oversight required.",
    points: [
      "Configurable position limits per instrument and strategy",
      "Real-time VaR/CVaR with automatic position reduction",
      "Drawdown circuit breakers with tiered escalation",
      "Full audit trail for regulatory reporting (MiFID II ready)",
    ],
  },
];

/* ---- Live preview panels for each tab ---- */
function StrategyPreview() {
  return (
    <div className="space-y-4">
      <StrategyBuilderPreview />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Sharpe Ratio", value: backtestMetrics.sharpe.toFixed(2), color: "text-emerald-400" },
          { label: "Win Rate", value: `${backtestMetrics.winRate}%`, color: "text-primary" },
          { label: "Total Return", value: `+${backtestMetrics.totalReturn}%`, color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className={`text-sm font-display font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPreview() {
  return (
    <div className="space-y-4">
      {/* Chat-like interface */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Brain className="w-3 h-3 text-primary" />
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/5 text-xs text-foreground/80">
            Strategy generated: Mean Reversion + Momentum Crossover on WTI. Entry: RSI &lt; 30 + 20-period SMA crossover. Risk: 2% per trade.
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-foreground/80">
            Backtest complete: 18.7% CAGR, 1.84 Sharpe, 68.3% win rate over 10 years. Ready to deploy.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Strategies Generated</div>
          <div className="text-lg font-display font-bold text-foreground">47</div>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Avg Build Time</div>
          <div className="text-lg font-display font-bold text-primary">&lt; 30s</div>
        </div>
      </div>
    </div>
  );
}

function DataPreview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { symbol: "CL", price: "78.42", change: "+0.92%", up: true },
          { symbol: "BZ", price: "82.15", change: "+0.71%", up: true },
          { symbol: "NG", price: "2.84", change: "-2.10%", up: false },
          { symbol: "GC", price: "2,048.30", change: "-0.18%", up: false },
        ].map((m) => (
          <div key={m.symbol} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.symbol}</div>
            <div className="text-sm font-mono font-bold text-foreground">${m.price}</div>
            <div className={`text-[10px] font-mono ${m.up ? "text-emerald-400" : "text-red-400"}`}>{m.change}</div>
          </div>
        ))}
      </div>
      <PreviewChart data={equityCurveData} color="#f59e0b" height={100} />
    </div>
  );
}

/* Preview components defined outside to avoid recreation */
function RiskPreview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Portfolio VaR (95%)", value: "$12,400", color: "text-red-400" },
          { label: "Max Drawdown", value: "-12.4%", color: "text-red-400" },
          { label: "Position Limit Utilization", value: "67%", color: "text-amber-400" },
          { label: "Circuit Breaker Status", value: "ARMED", color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className={`text-sm font-display font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>
      <PnLBars data={dailyPnlData} height={80} />
    </div>
  );
}

const previewComponents: Record<string, FC> = {
  strategy: StrategyPreview,
  ai: AIPreview,
  data: DataPreview,
  risk: RiskPreview,
};

export default function PlatformSection() {
  const [activeTab, setActiveTab] = useState("strategy");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const active = tabs.find((t) => t.id === activeTab)!;
  const PreviewComp = previewComponents[activeTab];

  return (
    <section id="platform" className="py-24 lg:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.13_0.009_260/50%)] to-transparent pointer-events-none" />

      <div className="container relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <div className="section-number mb-3">02 — Platform</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            From Signal to Execution,{" "}
            <span className="text-primary">All in One Place</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Aether is purpose-built for crude oil and energy markets — no stock
            trader bloat, no crypto gimmicks. Just institutional quant tools
            laser-focused on the commodities that move the global economy.
          </p>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-10"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary/15 border border-primary/40 text-primary"
                    : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/8"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Tab content */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="font-display text-3xl lg:text-4xl font-700 text-white mb-4 leading-tight">
                {active.headline}
              </h3>
              <p className="text-white/60 text-base leading-relaxed mb-8">
                {active.description}
              </p>
              <ul className="space-y-3">
                {active.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-white/75 text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Right: Live preview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`preview-${active.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-background/50 backdrop-blur-xl p-5 shadow-2xl shadow-black/40">
                {PreviewComp && <PreviewComp />}
              </div>
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl pointer-events-none -z-10" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
