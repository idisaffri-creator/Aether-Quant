import { useRef, useEffect, useState } from "react";
import { Check, Zap, Building2, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

const plans = [
  {
    id: "free",
    icon: Zap,
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "Explore the platform",
    description: "Learn oil quant strategies with paper trading, delayed data, and basic backtesting. No credit card needed.",
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
    tagline: "For serious individual traders",
    description: "Live trading, real-time data, full AI quant assistant, and 10-year backtesting — everything a solo operator needs.",
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
    tagline: "For funds and institutions",
    description: "White-label terminal, custom broker integrations, multi-user RBAC, SAML/SSO, and dedicated compliance framework.",
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-2xl mb-12 md:mb-20"
        >
          <div className="section-number mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-500" />
            06 — Pricing
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Simple, Transparent{" "}
            <span className="text-amber-400">Pricing Models</span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Start with free paper trading. Subscribe when you're ready for live
            execution. No lock-in, no hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-sm p-6 lg:p-8 border transition-all duration-300 group ${
                  plan.highlight
                    ? "bg-[oklch(0.16_0.012_260)] border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.1)] md:scale-105 z-10"
                    : "glass-card border-white/8 hover:border-white/20"
                }`}
              >
                {/* Recommended badge */}
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="px-4 py-1 rounded-sm bg-amber-500 text-[oklch(0.10_0.01_60)] text-[10px] font-mono font-bold tracking-widest uppercase shadow-lg shadow-amber-500/30">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className={`w-12 h-12 rounded-sm flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                      plan.highlight ? "bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-white/5"
                    }`}>
                      <Icon className={`w-6 h-6 ${plan.highlight ? "text-amber-400" : "text-white/40"}`} />
                    </div>
                    <div className="font-display text-2xl font-bold text-white tracking-tight">{plan.name}</div>
                    <div className={`text-[10px] font-mono font-bold tracking-[0.2em] mt-1 uppercase ${
                      plan.highlight ? "text-amber-400" : "text-white/30"
                    }`}>
                      {plan.tagline}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-bold text-white">{plan.price}</div>
                    {plan.period && <div className="text-white/30 text-[11px] font-mono font-bold uppercase mt-1">{plan.period.replace("/", "")}ly</div>}
                  </div>
                </div>

                <p className="text-white/50 text-sm leading-relaxed mb-8 min-h-[48px]">
                  {plan.description}
                </p>

                {/* Features */}
                <div className="space-y-4 mb-10">
                  <div className="text-[10px] font-mono font-bold text-white/20 tracking-widest uppercase mb-4">Core Features</div>
                  <ul className="space-y-3.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 group/feat">
                        <div className={`mt-1 transition-colors ${plan.highlight ? "text-amber-500" : "text-emerald-500"}`}>
                           <Check className="w-4 h-4" />
                        </div>
                        <span className="text-white/70 text-sm group-hover/feat:text-white transition-colors">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => handleCta(plan.id)}
                  className={`w-full rounded-sm py-6 text-xs font-bold uppercase tracking-widest transition-all ${
                    plan.highlight
                      ? "btn-amber shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                      : "border border-white/20 bg-transparent text-white/60 hover:bg-white/5 hover:text-white hover:border-white/40"
                  }`}
                >
                  {plan.cta}
                </Button>
                
                {plan.highlight && (
                   <div className="mt-4 flex items-center justify-center gap-2">
                      <Sparkles className="w-3 h-3 text-amber-500/60" />
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">Instant Node Activation</span>
                   </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-10 lg:mt-16 text-center"
        >
          <p className="text-white/30 text-xs font-mono uppercase tracking-[0.2em]">
            All institutional nodes include 14-day zero-latency trial · No KYC required for base tier
          </p>
        </motion.div>
      </div>
    </section>
  );
}
