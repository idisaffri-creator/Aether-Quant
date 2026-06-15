/* ============================================================
   AETHER ENERGY — Testimonials Section
   Design: Elemental Precision — Glass cards with gradient borders,
   user avatars, and amber quote marks
   ============================================================ */
import { useRef, useEffect, useState } from "react";

const testimonials = [
  {
    quote:
      "Aether has completely changed how I approach oil trading. I built a mean-reversion strategy in under an hour that I'd been trying to code for months. The backtesting results were eye-opening.",
    name: "Marcus Chen",
    title: "Commodity Fund Manager",
    company: "Meridian Capital",
    initials: "MC",
    color: "bg-blue-500/20 text-blue-300",
  },
  {
    quote:
      "As an energy company trader, I needed a tool that understood oil-specific dynamics — inventory cycles, geopolitical risk, seasonal patterns. Aether gets it. The AI assistant is genuinely useful.",
    name: "Sarah Okonkwo",
    title: "Senior Energy Trader",
    company: "Petrolex Energy",
    initials: "SO",
    color: "bg-amber-500/20 text-amber-300",
  },
  {
    quote:
      "The risk management tools alone are worth the subscription. Position limits, drawdown alerts, and circuit breakers that actually work. This is institutional-grade tooling at a fraction of the cost.",
    name: "James Whitfield",
    title: "Portfolio Manager",
    company: "Whitfield Advisors",
    initials: "JW",
    color: "bg-emerald-500/20 text-emerald-300",
  },
  {
    quote:
      "I've tried every trading platform out there. Aether is the first one built specifically for oil markets. The WTI/Brent data integration, the EIA report triggers — it's exactly what I needed.",
    name: "Priya Nair",
    title: "Independent Trader",
    company: "Private",
    initials: "PN",
    color: "bg-purple-500/20 text-purple-300",
  },
  {
    quote:
      "The paper trading environment is incredibly realistic. I ran my strategy for 3 months in simulation before going live. The transition was seamless and my live results matched the backtest closely.",
    name: "David Kowalski",
    title: "Algorithmic Trader",
    company: "DK Trading",
    initials: "DK",
    color: "bg-cyan-500/20 text-cyan-300",
  },
  {
    quote:
      "Our fund manages $200M in commodity exposure. Aether's enterprise features — multi-user management, compliance reporting, audit trails — meet our regulatory requirements perfectly.",
    name: "Elena Vasquez",
    title: "Chief Investment Officer",
    company: "Vantage Commodities",
    initials: "EV",
    color: "bg-rose-500/20 text-rose-300",
  },
];

export default function TestimonialsSection() {
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
    <section className="py-24 lg:py-32 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.12_0.009_260/60%)] to-transparent pointer-events-none" />

      <div className="container relative z-10">
        {/* Header */}
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">08 — Testimonials</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            Trusted by{" "}
            <span className="text-amber-400">Oil Market Professionals</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            From energy company traders to commodity fund managers, Aether is
            becoming the platform of choice for serious oil market participants.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`gradient-border rounded-2xl p-6 transition-all duration-700 hover:scale-[1.01] ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Quote mark */}
              <div className="text-amber-400/30 text-6xl font-display leading-none mb-3 select-none">
                "
              </div>

              <p className="text-white/70 text-sm leading-relaxed mb-6">
                {t.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-xs font-display font-700 shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-white text-sm font-600">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.title} · {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
