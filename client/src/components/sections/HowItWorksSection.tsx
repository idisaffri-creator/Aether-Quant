/* ============================================================
   AETHER ENERGY — How It Works Section
   Design: Elemental Precision — Numbered steps with
   connecting amber lines, alternating layout
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import { UserPlus, Layers, FlaskConical, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign Up & Configure Risk Profile",
    description:
      "Create your account and set your risk parameters — max position size, drawdown limits, and preferred instruments. Compliance checks run in the background.",
    detail: "Under 5 minutes to start",
  },
  {
    number: "02",
    icon: Layers,
    title: "Build Your Quant Strategy Visually",
    description:
      "Start from a template or wire your own logic on the visual canvas — connect entry signals, risk gates, and execution triggers by arranging blocks on a directed graph.",
    detail: "Visual strategy builder",
  },
  {
    number: "03",
    icon: FlaskConical,
    title: "Backtest, Validate, Optimise",
    description:
      "Run against 10 years of WTI/Brent ticks with realistic slippage. Review Sharpe, max drawdown, and win rate. Run Monte Carlo to stress-test across 10,000 simulated paths. Let AI optimise parameters.",
    detail: "Full results in seconds",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Deploy & Monitor Live",
    description:
      "Go live via Interactive Brokers, ICE, or CME with one click. Monitor positions, P&L, and risk exposure in real time. Set circuit breakers to auto-reduce if drawdown limits are breached.",
    detail: "Paper trade first, then deploy",
  },
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 lg:py-32 relative" ref={ref}>
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.13_0.009_260/60%)] to-transparent pointer-events-none" />

      <div className="container relative z-10">
        {/* Section header */}
        <div className={`max-w-2xl mb-20 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">04 — Process</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            From Concept to{" "}
            <span className="text-amber-400">Live Execution</span>
            <br />in Four Steps
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Aether's guided workflow takes you from account creation to
            a live-deployed quant strategy in a single session — no
            terminal window required.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute left-[2.75rem] top-12 bottom-12 w-px bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-transparent" />

          <div className="space-y-8 lg:space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className={`relative flex flex-col lg:flex-row gap-6 lg:gap-10 items-start lg:items-center transition-all duration-700 ${
                    inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                  } ${i > 0 ? "lg:mt-12" : ""}`}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {/* Step indicator */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-[oklch(0.16_0.012_260)] border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 z-10">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="font-data text-xs text-amber-500/60 font-600 mt-2 tracking-widest">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 glass-card rounded-2xl p-6 lg:p-8 border border-white/8 hover:border-amber-500/20 transition-all duration-300 group">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-display text-xl lg:text-2xl font-700 text-white mb-3">
                          {step.title}
                        </h3>
                        <p className="text-white/60 text-base leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      <div className="shrink-0 lg:ml-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-data font-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
