/* ============================================================
   AETHER ENERGY — Stats / Social Proof Section
   Design: Elemental Precision — Full-width dark band with
   key metrics and performance targets
   ============================================================ */
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: "1.2+", label: "Target Sharpe Ratio", sub: "Risk-adjusted performance" },
  { value: "<15%", label: "Max Drawdown Target", sub: "Capital protection" },
  { value: "55%+", label: "Win Rate Target", sub: "Strategy success rate" },
  { value: "1.5+", label: "Profit Factor Target", sub: "Reward-to-risk ratio" },
  { value: "99.5%", label: "Platform Uptime", sub: "Guaranteed availability" },
  { value: "$0", label: "To Start", sub: "Free paper trading forever" },
];

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-[oklch(0.14_0.010_260)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px amber-rule" />
      <div className="absolute bottom-0 left-0 right-0 h-px amber-rule" />

      <div className="container relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="font-display text-3xl lg:text-4xl font-700 text-amber-400 mb-1">
                {stat.value}
              </div>
              <div className="text-white text-sm font-600 mb-0.5">{stat.label}</div>
              <div className="text-white/40 text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
