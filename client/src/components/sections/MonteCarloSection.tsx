/* ============================================================
   AETHER ENERGY — Monte Carlo Simulation Section
   Design: Elemental Precision — Dark panel with animated
   probability distribution chart, scenario bands, and
   feature breakdown cards
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import { TrendingUp, ShieldCheck, Sliders, BarChart3, Zap, AlertTriangle } from "lucide-react";

// Simulated Monte Carlo equity curve data
function generateEquityCurves(count: number, steps: number, seed: number) {
  const curves: number[][] = [];
  let rng = seed;
  const next = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };
  for (let c = 0; c < count; c++) {
    const curve: number[] = [100];
    for (let s = 1; s < steps; s++) {
      const ret = (next() - 0.485) * 4.5;
      curve.push(Math.max(50, curve[s - 1] * (1 + ret / 100)));
    }
    curves.push(curve);
  }
  return curves;
}

const STEPS = 60;
const curves = generateEquityCurves(200, STEPS, 42);

// Compute percentile bands
function percentile(arr: number[], p: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

const bands = Array.from({ length: STEPS }, (_, i) => {
  const vals = curves.map((c) => c[i]);
  return {
    p5: percentile(vals, 5),
    p25: percentile(vals, 25),
    p50: percentile(vals, 50),
    p75: percentile(vals, 75),
    p95: percentile(vals, 95),
  };
});

const chartW = 520;
const chartH = 220;
const minVal = 60;
const maxVal = 160;
const toY = (v: number) => chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
const toX = (i: number) => (i / (STEPS - 1)) * chartW;

function bandPath(key: "p5" | "p25" | "p50" | "p75" | "p95", reverse = false) {
  const pts = bands.map((b, i) => `${toX(i)},${toY(b[key])}`);
  if (reverse) pts.reverse();
  return pts.join(" L ");
}

const p95Path = `M ${bandPath("p95")}`;
const p75Path = `M ${bandPath("p75")}`;
const p50Path = `M ${bandPath("p50")}`;
const p25Path = `M ${bandPath("p25")}`;
const p5Path  = `M ${bandPath("p5")}`;

// Filled band paths
const band9575 = `M ${bandPath("p95")} L ${bandPath("p75", true)} Z`;
const band7525 = `M ${bandPath("p75")} L ${bandPath("p25", true)} Z`;
const band255  = `M ${bandPath("p25")} L ${bandPath("p5", true)} Z`;

const features = [
  {
    icon: BarChart3,
    title: "10,000+ Scenario Simulations",
    desc: "Run your strategy against thousands of randomized price paths derived from historical WTI/Brent volatility and drift parameters.",
  },
  {
    icon: ShieldCheck,
    title: "Drawdown Probability Forecasting",
    desc: "Know the statistical likelihood of hitting any drawdown level before you risk real capital. Set circuit breakers based on data, not guesswork.",
  },
  {
    icon: Sliders,
    title: "Parameter Stability Analysis",
    desc: "Identify robust parameter zones where your strategy performs consistently — not just the single overfitted value that looks best on one backtest.",
  },
  {
    icon: TrendingUp,
    title: "VaR & CVaR Risk Metrics",
    desc: "Institutional-grade Value at Risk and Conditional VaR calculations, showing your worst-case exposure at 95% and 99% confidence levels.",
  },
  {
    icon: Zap,
    title: "Trade Sequence Randomization",
    desc: "Shuffle historical trade order to test whether your Sharpe ratio holds across all possible orderings — not just the lucky historical sequence.",
  },
  {
    icon: AlertTriangle,
    title: "Ruin Probability Calculator",
    desc: "Simulate optimal position sizing using Kelly Criterion variants, showing the probability of account ruin at different leverage levels.",
  },
];

export default function MonteCarloSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    let start: number | null = null;
    const duration = 1800;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setAnimProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView]);

  // Clip the chart paths based on animation progress
  const clipX = animProgress * chartW;

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 relative overflow-hidden"
      id="monte-carlo"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, oklch(0.72 0.18 60) 0%, transparent 70%)" }}
        />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <div
          className={`max-w-3xl mb-16 transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="section-number mb-3">Advanced Analytics</div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Monte Carlo{" "}
            <span className="text-amber-400">Simulation Engine</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed max-w-2xl">
            Standard backtesting shows you one possible past. Monte Carlo shows you{" "}
            <strong className="text-white/80">10,000 possible futures</strong> — giving you
            true statistical confidence before you deploy a single dollar of real capital.
          </p>
        </div>

        {/* Main content: chart + stats */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-5 gap-8 mb-16 transition-all duration-700 delay-100 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Chart panel */}
          <div className="lg:col-span-3 gradient-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-white font-semibold text-sm">Strategy Equity Distribution</div>
                <div className="text-white/40 text-xs mt-0.5">10,000 simulated paths · WTI Mean Reversion v2</div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-medium">Monte Carlo</span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="relative overflow-hidden rounded-xl bg-[oklch(0.10_0.008_260)] p-3">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full"
                style={{ height: "220px" }}
                preserveAspectRatio="none"
              >
                <defs>
                  <clipPath id="mc-clip">
                    <rect x="0" y="0" width={clipX} height={chartH} />
                  </clipPath>
                  {/* Grid lines */}
                </defs>

                {/* Horizontal grid lines */}
                {[70, 90, 100, 110, 130, 150].map((v) => (
                  <line
                    key={v}
                    x1={0} y1={toY(v)} x2={chartW} y2={toY(v)}
                    stroke="oklch(1 0 0 / 6%)"
                    strokeWidth="1"
                  />
                ))}

                {/* Band fills */}
                <path d={band9575} fill="oklch(0.72 0.18 60 / 8%)" clipPath="url(#mc-clip)" />
                <path d={band7525} fill="oklch(0.72 0.18 60 / 14%)" clipPath="url(#mc-clip)" />
                <path d={band255}  fill="oklch(0.72 0.18 60 / 8%)" clipPath="url(#mc-clip)" />

                {/* Band outlines */}
                <path d={p95Path} fill="none" stroke="oklch(0.72 0.18 60 / 25%)" strokeWidth="1" strokeDasharray="4 3" clipPath="url(#mc-clip)" />
                <path d={p75Path} fill="none" stroke="oklch(0.72 0.18 60 / 40%)" strokeWidth="1.5" clipPath="url(#mc-clip)" />
                <path d={p25Path} fill="none" stroke="oklch(0.72 0.18 60 / 40%)" strokeWidth="1.5" clipPath="url(#mc-clip)" />
                <path d={p5Path}  fill="none" stroke="oklch(0.72 0.18 60 / 25%)" strokeWidth="1" strokeDasharray="4 3" clipPath="url(#mc-clip)" />

                {/* Median line */}
                <path d={p50Path} fill="none" stroke="oklch(0.72 0.18 60)" strokeWidth="2.5" clipPath="url(#mc-clip)" />

                {/* Baseline */}
                <line x1={0} y1={toY(100)} x2={chartW} y2={toY(100)} stroke="oklch(0.60 0.15 250 / 40%)" strokeWidth="1" strokeDasharray="6 4" />
              </svg>

              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-3 pl-1 pointer-events-none">
                {["150", "130", "110", "100", "90", "70"].map((v) => (
                  <span key={v} className="text-white/25 text-[10px]" style={{ fontFamily: "'Space Grotesk', monospace" }}>{v}</span>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {[
                { color: "bg-amber-400", label: "Median (P50)" },
                { color: "bg-amber-400/50", label: "P25–P75 band" },
                { color: "bg-amber-400/20", label: "P5–P95 range" },
                { color: "bg-blue-400/60", label: "Breakeven" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-0.5 rounded-full ${l.color}`} />
                  <span className="text-white/40 text-xs">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {[
              { label: "Probability of Profit", value: "78%", sub: "Across all simulated paths", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Median Return (1Y)", value: "+14.2%", sub: "P50 equity curve outcome", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              { label: "5th Percentile Outcome", value: "−6.1%", sub: "Worst 5% of scenarios", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
              { label: "Max Simulated Drawdown", value: "18.4%", sub: "99th percentile worst case", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
              { label: "Sharpe Ratio (Median)", value: "1.42", sub: "Risk-adjusted performance", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`rounded-xl border px-4 py-3.5 ${stat.bg} transition-all duration-500`}
                style={{ transitionDelay: `${i * 80 + 200}ms` }}
              >
                <div className="text-white/50 text-xs mb-1">{stat.label}</div>
                <div className={`font-display text-2xl font-bold ${stat.color}`} style={{ fontFamily: "'Space Grotesk', monospace" }}>
                  {stat.value}
                </div>
                <div className="text-white/30 text-xs mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`gradient-border rounded-2xl p-5 transition-all duration-700 hover:scale-[1.01] ${
                  inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 70 + 400}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <div className="text-white font-semibold text-sm mb-2">{f.title}</div>
                <div className="text-white/50 text-sm leading-relaxed">{f.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Bottom callout */}
        <div
          className={`mt-12 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6 transition-all duration-700 delay-500 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="flex-1">
            <div className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-2">Why This Matters</div>
            <div className="font-display text-xl font-bold text-white mb-2">
              Stop Relying on a Single Backtest
            </div>
            <p className="text-white/55 text-sm leading-relaxed max-w-2xl">
              A strategy that returned 22% in one historical backtest might have a 40% probability of losing money
              under realistic market conditions. Monte Carlo simulation is the only way to know the difference
              between a genuinely robust strategy and one that got lucky on a single path through history.
            </p>
          </div>
          <div className="shrink-0">
            <button
              className="px-6 py-3 rounded-xl font-semibold text-sm text-black"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.18 60), oklch(0.65 0.20 55))" }}
              onClick={() => {
                const el = document.getElementById("pricing");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Run Your First Simulation →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
