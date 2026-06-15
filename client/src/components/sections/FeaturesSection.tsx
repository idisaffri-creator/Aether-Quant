/* ============================================================
   AETHER ENERGY — Features Section
   Design: Elemental Precision — Masonry-style feature cards
   with amber glow on hover, dark glass cards
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import {
  Cpu, TrendingUp, BarChart2, Globe, Lock, Zap,
  BookOpen, Users, RefreshCw
} from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "No-Code Strategy Builder",
    description:
      "Build sophisticated algorithmic strategies using a visual drag-and-drop interface. Connect pre-built blocks for signals, indicators, and execution logic without writing a single line of code.",
    highlight: true,
    size: "large",
  },
  {
    icon: TrendingUp,
    title: "AI-Powered Optimization",
    description:
      "Let Aether's AI automatically tune your strategy parameters, adapt to changing market regimes, and optimize for risk-adjusted returns.",
    highlight: false,
    size: "normal",
  },
  {
    icon: BarChart2,
    title: "Advanced Backtesting",
    description:
      "Test your strategies against 10 years of historical WTI and Brent data with realistic slippage, commissions, and market impact modeling.",
    highlight: false,
    size: "normal",
  },
  {
    icon: Globe,
    title: "Real-Time Oil Market Data",
    description:
      "Live WTI/Brent prices, EIA inventory reports, OPEC announcements, geopolitical risk indicators, and shipping data — all in one place.",
    highlight: false,
    size: "normal",
  },
  {
    icon: Lock,
    title: "Institutional Risk Controls",
    description:
      "Position size limits, maximum drawdown circuit breakers, volatility-based sizing, correlation monitoring, and full regulatory audit trails.",
    highlight: false,
    size: "normal",
  },
  {
    icon: Zap,
    title: "Paper Trading Environment",
    description:
      "Validate your strategies in a realistic simulation environment with historical data replay before risking real capital.",
    highlight: false,
    size: "normal",
  },
  {
    icon: BookOpen,
    title: "Strategy Template Library",
    description:
      "Start from 50+ professionally designed templates covering mean reversion, momentum, calendar spreads, and news-based triggers.",
    highlight: false,
    size: "normal",
  },
  {
    icon: Users,
    title: "Multi-User Management",
    description:
      "Enterprise-grade role-based access control with Admin, Institutional, Retail, and Viewer roles. Perfect for fund managers and teams.",
    highlight: false,
    size: "normal",
  },
  {
    icon: RefreshCw,
    title: "Broker Integration",
    description:
      "Connect to Interactive Brokers and other major brokers for live execution. Full order management, position tracking, and execution quality monitoring.",
    highlight: false,
    size: "normal",
  },
];

function FeatureCard({ feature, index, inView }: { feature: typeof features[0]; index: number; inView: boolean }) {
  const Icon = feature.icon;
  return (
    <div
      className={`group glass-card rounded-2xl p-6 border transition-all duration-500 hover:border-amber-500/30 hover:bg-[oklch(0.18_0.012_260/80%)] cursor-default ${
        feature.highlight
          ? "border-amber-500/25 bg-[oklch(0.16_0.012_260/90%)]"
          : "border-white/8"
      } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
        feature.highlight
          ? "bg-amber-500/20 group-hover:bg-amber-500/30"
          : "bg-white/8 group-hover:bg-amber-500/15"
      }`}>
        <Icon className={`w-5 h-5 transition-colors duration-300 ${
          feature.highlight ? "text-amber-400" : "text-white/60 group-hover:text-amber-400"
        }`} />
      </div>

      <h3 className="font-display text-lg font-600 text-white mb-2 leading-snug">
        {feature.title}
      </h3>
      <p className="text-white/55 text-sm leading-relaxed">
        {feature.description}
      </p>

      {feature.highlight && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-amber-400 text-xs font-data font-600 tracking-wider">
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
          CORE FEATURE
        </div>
      )}
    </div>
  );
}

export default function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-24 lg:py-32 relative" ref={ref}>
      <div className="container">
        {/* Section header */}
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">03 — Features</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            Built for the{" "}
            <span className="text-amber-400">Serious Trader</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Every feature in Aether is designed around the specific demands of
            crude oil markets — from geopolitical risk to inventory cycles.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
