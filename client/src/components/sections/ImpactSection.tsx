/*
 * Impact Statement — clear, bold copy that quantifies what Aether does.
 * "We turn $100k and 30 minutes into a live trading operation."
 */
import { motion } from "framer-motion";
import { Zap, TrendingUp, Brain, Shield, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const impacts = [
  {
    metric: "$0 → Live in 30 min",
    label: "Onboarding",
    description: "From signup to your first paper trade. No credit card, no sales call, no waiting.",
    icon: Zap,
  },
  {
    metric: "76 API endpoints",
    label: "Integrations",
    description: "OpenAPI 3.1, WebSocket, CSV exports, Grafana dashboards. Plug into anything.",
    icon: Brain,
  },
  {
    metric: "8 PM2 workers + 6 services",
    label: "Scale",
    description: "Single VPS serves 1000s of concurrent users. Read replicas + Redis pub/sub for WS.",
    icon: TrendingUp,
  },
  {
    metric: "10 risk checks / order",
    label: "Safety",
    description: "Max position, daily loss, kill switch, slippage, 2FA for admin, JWT lockout. Every order.",
    icon: Shield,
  },
];

export default function ImpactSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

      <div className="relative max-w-5xl mx-auto">
        {/* Hero statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase mb-6">
            The impact
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.05]">
            We turn <span className="text-primary">$100k</span> and
            <br />
            <span className="text-primary">30 minutes</span> into a
            <br />
            <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
              live trading operation.
            </span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            Open the dashboard. Clone a strategy. Watch it trade against live market data. When you're ready, switch to live with one click. That's it. No contracts, no setup fees, no trading desk.
          </p>
        </motion.div>

        {/* Impact grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {impacts.map((impact, i) => {
            const Icon = impact.icon;
            return (
              <motion.div
                key={impact.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-display font-bold tracking-tight">{impact.metric}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{impact.label}</div>
                    <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{impact.description}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Link href="/login">
            <div className="inline-flex items-center gap-2 text-base font-semibold text-foreground hover:text-primary transition-colors cursor-pointer group">
              Start trading in 30 seconds
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">No credit card. No sales call. Cancel anytime.</p>
        </motion.div>
      </div>
    </section>
  );
}
