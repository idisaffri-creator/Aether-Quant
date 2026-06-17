/*
 * Quant Tools — backtest + Monte Carlo + optimization.
 * The "hardcore numbers" section. Shows real tooling, real metrics.
 */
import { motion } from "framer-motion";
import { GitBranch, BarChart3, Target, TrendingUp, AlertTriangle, Activity, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

const tools = [
  {
    icon: GitBranch,
    name: "Strategy Builder",
    desc: "Drag-and-drop rules. RSI < 30 → buy, ATR breakout → sell. No code. If you can describe it, you can deploy it.",
    stat: "8 templates",
    color: "text-amber-400",
  },
  {
    icon: Activity,
    name: "Backtest Engine",
    desc: "Years of historical data per symbol. Sharpe, Sortino, max DD, win rate, profit factor — calculated in seconds, not hours.",
    stat: "10-year history",
    color: "text-blue-400",
  },
  {
    icon: BarChart3,
    name: "Monte Carlo Simulator",
    desc: "Run your strategy against 10,000 randomized price paths. Find the 5th percentile outcome before you risk a cent.",
    stat: "10,000 paths",
    color: "text-purple-400",
  },
  {
    icon: Target,
    name: "Parameter Optimizer",
    desc: "Brute-force sweep across lookback, threshold, hold days. Heatmap shows robust zones, not overfit peaks.",
    stat: "Auto-robustness",
    color: "text-emerald-400",
  },
];

const stats = [
  { value: "10,000", label: "Monte Carlo paths per run" },
  { value: "76", label: "API endpoints exposed" },
  { value: "8", label: "Energy commodities" },
  { value: "24/7", label: "Background workers" },
];

export default function QuantToolsSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 tracking-wider uppercase mb-4"
          >
            <BarChart3 className="w-3 h-3" />
            The quant toolkit
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight"
          >
            The math behind <span className="text-blue-400">the magic</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base lg:text-lg text-muted-foreground mt-5"
          >
            No black boxes. Every signal, every fill, every P&L number is auditable. The same tools the pros use, exposed through a clean UI.
          </motion.p>
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
          {tools.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-6 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl bg-card border border-white/10 flex items-center justify-center ${t.color} flex-shrink-0`}>
                  <t.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-base">{t.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">· {t.stat}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Big numbers strip */}
        <div className="glass-card rounded-2xl p-8 border border-primary/20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="text-center"
              >
                <div className="text-3xl lg:text-4xl font-display font-bold tracking-tight text-primary">
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link href="/dashboard/backtest">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-accent/30 text-sm font-semibold cursor-pointer transition-colors">
              Try a backtest now
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}