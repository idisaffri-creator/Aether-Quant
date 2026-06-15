/* ============================================================
   AETHER ENERGY — Pricing Section
   Design: Elemental Precision — Three-tier pricing cards
   with amber highlight on recommended plan
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import { Check, Zap, Building2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    icon: Zap,
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "Start your journey",
    description: "Perfect for learning oil markets and testing strategies with zero risk.",
    cta: "Start Free",
    ctaVariant: "outline" as const,
    highlight: false,
    features: [
      "Paper trading only",
      "5 basic strategy templates",
      "Delayed market data (15 min)",
      "Basic backtesting (2 years)",
      "Community support",
      "Educational content library",
    ],
    missing: [
      "Live trading",
      "AI assistant",
      "Real-time data",
      "Advanced risk tools",
    ],
  },
  {
    id: "pro",
    icon: Star,
    name: "Professional",
    price: "$99",
    period: "/month",
    tagline: "Most popular",
    description: "Full access to AI-powered trading tools for serious individual traders.",
    cta: "Get Early Access",
    ctaVariant: "default" as const,
    highlight: true,
    features: [
      "Live trading access",
      "50+ strategy templates",
      "Real-time WTI/Brent data",
      "Advanced AI assistant (GPT-4)",
      "Full backtesting (10 years)",
      "Advanced risk management",
      "TradingView chart integration",
      "Priority support",
      "Mobile-responsive access",
    ],
    missing: [],
  },
  {
    id: "enterprise",
    icon: Building2,
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For institutions",
    description: "White-label solutions, custom integrations, and dedicated compliance support.",
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    highlight: false,
    features: [
      "Everything in Professional",
      "Multi-user management",
      "White-label solutions",
      "Custom broker integrations",
      "SAML/SSO authentication",
      "Custom compliance rules",
      "Advanced regulatory reporting",
      "Dedicated account manager",
      "SLA guarantee (99.9% uptime)",
      "API access for power users",
    ],
    missing: [],
  },
];

export default function PricingSection() {
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

  const handleCta = (planId: string) => {
    if (planId === "enterprise") {
      toast.info("Enterprise sales team will be in touch — join the waitlist!");
    } else {
      toast.success("You're on the waitlist! We'll notify you when early access opens.");
    }
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 relative" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.13_0.009_260/40%)] to-transparent pointer-events-none" />

      <div className="container relative z-10">
        {/* Header */}
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">06 — Pricing</div>
          <h2 className="font-display text-4xl lg:text-5xl font-700 text-white leading-tight mb-4">
            Simple, Transparent{" "}
            <span className="text-amber-400">Pricing</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Start free with paper trading. Upgrade when you're ready to trade live.
            No hidden fees, no lock-in contracts.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 lg:p-8 border transition-all duration-700 ${
                  plan.highlight
                    ? "bg-[oklch(0.16_0.012_260)] border-amber-500/40 shadow-2xl shadow-amber-500/10 scale-105"
                    : "glass-card border-white/8 hover:border-white/15"
                } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Recommended badge */}
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-amber-500 text-[oklch(0.10_0.01_60)] text-xs font-data font-700 tracking-wider uppercase shadow-lg shadow-amber-500/30">
                      Recommended
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      plan.highlight ? "bg-amber-500/20" : "bg-white/8"
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.highlight ? "text-amber-400" : "text-white/60"}`} />
                    </div>
                    <div className="font-display text-xl font-700 text-white">{plan.name}</div>
                    <div className={`text-xs font-data font-600 tracking-wider mt-0.5 ${
                      plan.highlight ? "text-amber-400" : "text-white/40"
                    }`}>
                      {plan.tagline.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-700 text-white">{plan.price}</div>
                    {plan.period && <div className="text-white/40 text-sm">{plan.period}</div>}
                  </div>
                </div>

                <p className="text-white/55 text-sm leading-relaxed mb-6">
                  {plan.description}
                </p>

                {/* Amber rule */}
                <div className="amber-rule mb-6" />

                {/* Features */}
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? "text-amber-400" : "text-emerald-400/80"}`} />
                      <span className="text-white/70 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => handleCta(plan.id)}
                  className={`w-full rounded-xl py-2.5 text-sm font-600 ${
                    plan.highlight
                      ? "btn-amber"
                      : "border border-white/20 bg-transparent text-white/70 hover:bg-white/8 hover:text-white hover:border-white/30 transition-all"
                  }`}
                  variant={plan.ctaVariant}
                >
                  {plan.cta}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className={`mt-10 text-center transition-all duration-700 delay-300 ${inView ? "opacity-100" : "opacity-0"}`}>
          <p className="text-white/35 text-sm">
            All plans include a 14-day free trial of Professional features.
            No credit card required for Free tier.
          </p>
        </div>
      </div>
    </section>
  );
}
