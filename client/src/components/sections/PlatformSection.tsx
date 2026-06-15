/* ============================================================
   AETHER ENERGY — Platform Overview Section
   Design: Elemental Precision — Asymmetric layout with
   strategy builder mockup and feature tabs
   ============================================================ */
import { useState, useRef, useEffect } from "react";
import { Layers, Brain, BarChart3, Shield } from "lucide-react";

const STRATEGY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/9Yy77UtBAusMMpueToP3Ub/aether-strategy-builder-iZEMawrVCxPwgUU7ewEHhY.webp";
const DASHBOARD_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/9Yy77UtBAusMMpueToP3Ub/aether-dashboard-mockup-n55zg75Da9JTEqo5gsqmyx.webp";
const AI_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/9Yy77UtBAusMMpueToP3Ub/aether-ai-brain-UVTjSB9YmXQcGRtuciKWwm.webp";

const tabs = [
  {
    id: "strategy",
    icon: Layers,
    label: "Strategy Builder",
    headline: "Build Strategies Without Code",
    description:
      "Our visual drag-and-drop canvas lets you construct sophisticated trading strategies using pre-built blocks for technical indicators, AI signals, risk parameters, and execution logic. No programming knowledge required.",
    points: [
      "50+ pre-built strategy templates for oil markets",
      "Drag-and-drop conditional logic builder",
      "Real-time strategy validation and preview",
      "One-click backtesting against 10 years of data",
    ],
    image: STRATEGY_IMG,
  },
  {
    id: "ai",
    icon: Brain,
    label: "AI Assistant",
    headline: "Intelligence at Every Step",
    description:
      "Powered by GPT-4 and custom oil-market fine-tuned models, the Aether AI assistant helps you create strategies in natural language, explains every trade decision, and continuously optimizes your parameters.",
    points: [
      "Natural language strategy creation",
      '"Explain this trade" functionality',
      "Real-time market insight generation",
      "Auto-parameter tuning and optimization",
    ],
    image: AI_IMG,
  },
  {
    id: "data",
    icon: BarChart3,
    label: "Market Data",
    headline: "Oil-Specific Intelligence",
    description:
      "Access real-time WTI and Brent prices, EIA inventory reports, geopolitical risk indicators, shipping and logistics data, and refining margin analytics — all in one unified dashboard.",
    points: [
      "Real-time WTI/Brent price feeds via Polygon.io",
      "EIA and OPEC inventory report integration",
      "Geopolitical risk and sentiment scoring",
      "Customizable alert system",
    ],
    image: DASHBOARD_IMG,
  },
  {
    id: "risk",
    icon: Shield,
    label: "Risk Management",
    headline: "Institutional-Grade Protection",
    description:
      "Comprehensive risk controls including position size limits, maximum drawdown alerts, volatility-based sizing, and circuit breakers — the same tools used by professional commodity funds.",
    points: [
      "Position size and exposure limits",
      "Maximum drawdown circuit breakers",
      "Volatility-adjusted position sizing",
      "Full regulatory audit trails",
    ],
    image: DASHBOARD_IMG,
  },
];

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function PlatformSection() {
  const [activeTab, setActiveTab] = useState("strategy");
  const { ref, inView } = useInView();
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <section id="platform" className="py-24 lg:py-32 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.13_0.009_260/50%)] to-transparent pointer-events-none" />

      <div className="container relative z-10" ref={ref}>
        {/* Section header */}
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">02 — Platform</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            Everything You Need to{" "}
            <span className="text-amber-400">Trade Smarter</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            A complete no-code ecosystem built specifically for crude oil markets,
            combining AI intelligence with institutional-grade execution.
          </p>
        </div>

        {/* Tab navigation */}
        <div className={`flex flex-wrap gap-2 mb-10 transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-amber-500/15 border border-amber-500/40 text-amber-400"
                    : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/8"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-500 ${inView ? "opacity-100" : "opacity-0"}`}>
          {/* Left: Text */}
          <div key={active.id} className="animate-fade-up">
            <h3 className="font-display text-3xl lg:text-4xl font-700 text-white mb-4 leading-tight">
              {active.headline}
            </h3>
            <p className="text-white/60 text-base leading-relaxed mb-8">
              {active.description}
            </p>
            <ul className="space-y-3">
              {active.points.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-white/75 text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Image */}
          <div key={`img-${active.id}`} className="relative animate-fade-up">
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
              <img
                src={active.image}
                alt={active.label}
                className="w-full h-auto"
              />
            </div>
            {/* Amber glow */}
            <div className="absolute -inset-4 bg-amber-500/5 rounded-3xl blur-2xl pointer-events-none -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
