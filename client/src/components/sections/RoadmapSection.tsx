/* ============================================================
   AETHER ENERGY — Roadmap Section
   Design: Elemental Precision — Horizontal timeline with
   quarterly milestones, amber progress indicator
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";

const phases = [
  {
    quarter: "2024",
    label: "Foundation",
    status: "completed",
    items: [
      "No-code strategy builder with visual canvas",
      "Bloomberg-grade terminal UI with live market data",
      "Monte Carlo simulation engine with 10,000 paths",
      "Paper trading with historical data replay",
      "50+ quant strategy templates",
    ],
  },
  {
    quarter: "H1 2025",
    label: "Intelligence Layer",
    status: "completed",
    items: [
      "Regime-adaptive AI optimisation engine",
      "Real-time WTI/Brent data via Polygon.io",
      "Multi-view terminal (market, news, movers, vol)",
      "Advanced risk controls (VaR, drawdown circuit breakers)",
      "Git-based strategy versioning",
    ],
  },
  {
    quarter: "H2 2025",
    label: "Institutional Grade",
    status: "completed",
    items: [
      "Multi-user RBAC with granular permissions",
      "Broker integration: Interactive Brokers, ICE, CME",
      "Walk-forward optimisation to prevent overfitting",
      "Geopolitical risk heatmap with sentiment scoring",
      "Roadmap-driven development process",
    ],
  },
  {
    quarter: "2026",
    label: "Scale & Connect",
    status: "active",
    items: [
      "Smart order routing across multiple venues",
      "Custom compliance rules engine",
      "API access for algorithmic clients",
      "White-label terminal for energy funds",
      "Execution quality analytics suite",
    ],
  },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/15",
    border: "border-emerald-400/30",
    label: "Completed",
  },
  active: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/15",
    border: "border-amber-400/40",
    label: "In Progress",
  },
  upcoming: {
    icon: Circle,
    color: "text-white/30",
    bg: "bg-white/5",
    border: "border-white/15",
    label: "Upcoming",
  },
};

export default function RoadmapSection() {
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
    <section id="roadmap" className="py-24 lg:py-32 relative" ref={ref}>
      <div className="container">
        {/* Header */}
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">07 — Roadmap</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            What We've Built,{" "}
            <span className="text-amber-400">What's Next</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Our development is driven by actual energy trader feedback — not
            boardroom theories. Here's where we've shipped and what's in the pipeline.
          </p>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {phases.map((phase, i) => {
            const config = statusConfig[phase.status as keyof typeof statusConfig];
            const Icon = config.icon;
            return (
              <div
                key={phase.quarter}
                className={`relative glass-card rounded-2xl p-6 border transition-all duration-700 ${config.border} ${
                  phase.status === "active" ? "shadow-lg shadow-amber-500/10" : ""
                } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Status badge */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg} border ${config.border} mb-4`}>
                  <Icon className={`w-3 h-3 ${config.color}`} />
                  <span className={`text-xs font-data font-600 tracking-wider ${config.color}`}>
                    {config.label.toUpperCase()}
                  </span>
                </div>

                {/* Quarter & label */}
                <div className="font-data text-xs text-white/40 font-600 tracking-widest mb-1">
                  {phase.quarter}
                </div>
                <h3 className="font-display text-xl font-700 text-white mb-4">
                  {phase.label}
                </h3>

                {/* Amber rule */}
                <div className="amber-rule mb-4" />

                {/* Items */}
                <ul className="space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${
                        phase.status === "completed" ? "bg-emerald-400" :
                        phase.status === "active" ? "bg-amber-400" : "bg-white/25"
                      }`} />
                      <span className={`text-sm leading-relaxed ${
                        phase.status === "upcoming" ? "text-white/35" : "text-white/65"
                      }`}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Active indicator */}
                {phase.status === "active" && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
