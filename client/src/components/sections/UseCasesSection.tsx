/*
 * Use Cases — 4 concrete trader personas, what they do on the platform,
 * what they get out of it. Sits between AgentFleet and QuantTools.
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Brain, Shield, Sparkles, Compass, Briefcase, FlaskConical, GitBranch, BarChart3, Radio, BookOpen, FileSearch, Bell, TrendingUp, Scale, Layers, ChevronRight, Zap } from "lucide-react";

const useCases = [
  {
    persona: "The Systematic Quant",
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/15 to-pink-500/5",
    accent: "border-purple-500/30",
    title: "Build once. Run forever.",
    description: "Define rules in plain English — RSI < 30, MACD cross, ATR breakout. Backtest against 10 years of data. Validate robustness with Quincy. Deploy and let 15 agents handle the rest.",
    agents: ["Scout", "Quincy", "Compass", "Hawk"],
    workflow: [
      { icon: GitBranch, label: "Design conditions" },
      { icon: FlaskConical, label: "Backtest 10y" },
      { icon: Sparkles, label: "Validate" },
      { icon: TrendingUp, label: "Deploy" },
    ],
    metric: "Avg backtest: 2.1s · Quincy rejects 88% of overfit strategies",
  },
  {
    persona: "The Risk Manager",
    icon: Shield,
    color: "text-emerald-400",
    gradient: "from-emerald-500/15 to-teal-500/5",
    accent: "border-emerald-500/30",
    title: "Sleep through the night.",
    description: "Hawk watches every open position every 30s. Argus catches structural breaks. Mercury pauses strategies before macro shocks. Ledger reconciles broker daily. Audit log captures every action.",
    agents: ["Hawk", "Argus", "Mercury", "Ledger", "Counsel"],
    workflow: [
      { icon: Shield, label: "Set limits" },
      { icon: Radio, label: "Hawk watches" },
      { icon: Bell, label: "Alerts fire" },
      { icon: Scale, label: "Compass rebalances" },
    ],
    metric: "10 risk checks per order · 30s monitoring latency · Zero capital loss from missed stops",
  },
  {
    persona: "The Macro Trader",
    icon: Layers,
    color: "text-blue-400",
    gradient: "from-blue-500/15 to-indigo-500/5",
    accent: "border-blue-500/30",
    title: "Trade the news, not the noise.",
    description: "Atlas reads COT positioning. Mercury pre-briefs every EIA, FOMC, OPEC. Press scores sentiment via Ollama. Echo tells you when your own behavior is hurting returns.",
    agents: ["Atlas", "Mercury", "Press", "Echo", "Sherlock"],
    workflow: [
      { icon: Layers, label: "Atlas: COT" },
      { icon: Bell, label: "Mercury: macro" },
      { icon: BookOpen, label: "Librarian: papers" },
      { icon: BarChart3, label: "Echo: journal" },
    ],
    metric: "12 macro events tracked 30d ahead · Weekly digest of 5 quant papers",
  },
  {
    persona: "The Part-Timer",
    icon: Briefcase,
    color: "text-amber-400",
    gradient: "from-amber-500/15 to-orange-500/5",
    accent: "border-amber-500/30",
    title: "Open at 7am. Closed by lunch.",
    description: "Clone a strategy from the marketplace, switch to live when ready, walk away. Price alerts push to Discord. Daily digest at 5pm. No babysitting required.",
    agents: ["Sage", "Hermes", "Compass", "Press"],
    workflow: [
      { icon: Sparkles, label: "Clone strategy" },
      { icon: Zap, label: "Switch to live" },
      { icon: Bell, label: "Alerts" },
      { icon: TrendingUp, label: "Weekly P&L" },
    ],
    metric: "From signup to first trade: 30s · Discord alerts · Daily email digest",
  },
];

export default function UseCasesSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 tracking-wider uppercase mb-4"
          >
            <Briefcase className="w-3 h-3" />
            What you can build
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight"
          >
            Four ways traders use Aether
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base lg:text-lg text-muted-foreground mt-5"
          >
            Pick the workflow that matches your style. The agents are interchangeable — they collaborate regardless of how you trade.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map((u, i) => (
            <motion.div
              key={u.persona}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`relative glass-card rounded-2xl p-6 overflow-hidden border ${u.accent} hover:border-primary/30 transition-colors`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${u.gradient} opacity-50`} />

              <div className="relative space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-card border border-white/10 flex items-center justify-center ${u.color}`}>
                      <u.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{u.persona}</div>
                      <h3 className="font-display font-bold text-lg leading-tight">{u.title}</h3>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {u.description}
                </p>

                {/* Workflow */}
                <div className="flex items-center gap-1 text-xs">
                  {u.workflow.map((step, j) => (
                    <div key={j} className="flex items-center gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1 bg-card/40 border border-white/5 rounded-md px-2 py-1.5 flex-1 min-w-0">
                        <step.icon className={`w-3 h-3 flex-shrink-0 ${u.color}`} />
                        <span className="truncate text-[11px] font-mono">{step.label}</span>
                      </div>
                      {j < u.workflow.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Agents used */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Agents:</span>
                  {u.agents.map((a) => (
                    <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {a}
                    </span>
                  ))}
                </div>

                {/* Outcome */}
                <div className="pt-2 border-t border-white/5 text-[10px] text-muted-foreground font-mono leading-relaxed">
                  {u.metric}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link href="/login">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-accent/30 text-sm font-semibold cursor-pointer transition-colors">
              Find your workflow
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}