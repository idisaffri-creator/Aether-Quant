/* ============================================================
   AETHER ENERGY — About / Target Users Section
   Design: Elemental Precision — Globe image with user segments
   and vision statement
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import { Building, TrendingUp, User, Briefcase } from "lucide-react";

const GLOBE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/9Yy77UtBAusMMpueToP3Ub/aether-globe-6emYkWKZ8xFPkmZ2qUpAJN.webp";

const users = [
  {
    icon: Building,
    title: "Energy Company Traders",
    description: "Hedging and speculation strategies tailored to upstream and downstream oil market dynamics.",
  },
  {
    icon: TrendingUp,
    title: "Commodity Fund Managers",
    description: "Portfolio allocation tools with institutional-grade risk management and compliance reporting.",
  },
  {
    icon: User,
    title: "Sophisticated Retail Traders",
    description: "Access to the same algorithmic tools previously available only to hedge funds and institutions.",
  },
  {
    icon: Briefcase,
    title: "Financial Advisors",
    description: "Client portfolio management with transparent performance analytics and regulatory compliance.",
  },
];

export default function AboutSection() {
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
    <section id="about" className="py-24 lg:py-32 relative overflow-hidden" ref={ref}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.13_0.009_260/50%)] to-transparent pointer-events-none" />

      <div className="container relative z-10">
        {/* Vision statement */}
        <div className={`max-w-3xl mx-auto text-center mb-20 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3 text-center">05 — Vision</div>
          <blockquote className="font-display text-2xl lg:text-3xl xl:text-4xl font-600 text-white leading-tight mb-6">
            "To democratize AI-powered oil trading by making institutional-grade
            algorithmic strategies accessible through an{" "}
            <span className="text-amber-400">intuitive no-code platform.</span>"
          </blockquote>
          <p className="text-white/50 text-base">
            — Aether Energy Vision Statement
          </p>
        </div>

        {/* Globe + Users grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Globe image */}
          <div className={`relative transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={GLOBE_IMG}
                alt="Global oil trading network"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-amber-500/15 pointer-events-none" />
            </div>
            {/* Glow */}
            <div className="absolute -inset-8 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          </div>

          {/* User segments */}
          <div className={`transition-all duration-700 delay-200 ${inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
            <div className="section-number mb-3">Who We Serve</div>
            <h2 className="font-display text-3xl lg:text-4xl font-700 text-white leading-tight mb-8">
              Built for Every Level of{" "}
              <span className="text-amber-400">Oil Market Participant</span>
            </h2>

            <div className="space-y-4">
              {users.map((user, i) => {
                const Icon = user.icon;
                return (
                  <div
                    key={user.title}
                    className={`flex gap-4 p-4 rounded-xl border border-white/8 hover:border-amber-500/20 hover:bg-[oklch(0.16_0.012_260/60%)] transition-all duration-300 group cursor-default transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                    style={{ transitionDelay: `${200 + i * 80}ms` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/8 group-hover:bg-amber-500/15 flex items-center justify-center shrink-0 transition-colors duration-300">
                      <Icon className="w-5 h-5 text-white/50 group-hover:text-amber-400 transition-colors duration-300" />
                    </div>
                    <div>
                      <div className="font-display text-base font-600 text-white mb-1">
                        {user.title}
                      </div>
                      <div className="text-white/55 text-sm leading-relaxed">
                        {user.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
