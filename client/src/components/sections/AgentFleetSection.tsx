/*
 * Agent Fleet — six named AI agents working 24/7.
 *
 * Each agent has:
 *   - Avatar / icon (custom SVG for personality)
 *   - Name + role
 *   - Personality / one-liner
 *   - Real status pulled from API where possible
 *   - Capabilities (what they actually do)
 *
 * The "Meet your AI trading team" section.
 */
import { motion } from "framer-motion";
import { Eye, Brain, GitBranch, Shield, Newspaper, Sparkles, ArrowRight, Activity, Zap, Database, AlertTriangle, Scale, BarChart3, GitCompare } from "lucide-react";
import { Link } from "wouter";

interface Agent {
  id: string;
  name: string;
  title: string;
  role: string;
  personality: string;
  status: "live" | "idle" | "scanning";
  capabilities: string[];
  metric: { label: string; value: string }[];
  color: string;
  icon: React.ReactNode;
  gradient: string;
}

const agents: Agent[] = [
  {
    id: "scout",
    name: "Scout",
    title: "The Watcher",
    role: "Signal Generation",
    personality: "Stares at every tick. Doesn't blink. Sleeps when you do.",
    status: "scanning",
    capabilities: [
      "Scans 8 symbols on every quote tick",
      "Calculates RSI, MACD, Bollinger, ATR",
      "Generates entry/exit signals within 200ms",
      "Respects your risk limits before alerting",
    ],
    metric: [
      { label: "Signals today", value: "247" },
      { label: "Hit rate", value: "64%" },
    ],
    color: "text-amber-400",
    icon: <Eye className="w-5 h-5" />,
    gradient: "from-amber-500/20 to-orange-500/10",
  },
  {
    id: "sherlock",
    name: "Sherlock",
    title: "The Detective",
    role: "Regime Detection",
    personality: "Reads the market's mood. Decides if it's a trend, a range, or chaos.",
    status: "live",
    capabilities: [
      "Classifies current market state (trend/range/volatile)",
      "Detects regime shifts in real-time",
      "Recommends strategy adjustments per regime",
      "Trained on 5 years of historical regime transitions",
    ],
    metric: [
      { label: "Current regime", value: "Low Vol Trend" },
      { label: "Accuracy", value: "78%" },
    ],
    color: "text-blue-400",
    icon: <Brain className="w-5 h-5" />,
    gradient: "from-blue-500/20 to-indigo-500/10",
  },
  {
    id: "quincy",
    name: "Quincy",
    title: "The Quant",
    role: "Strategy Validation",
    personality: "Suspicious of every backtest. Hunts for overfit. Finds robust zones.",
    status: "idle",
    capabilities: [
      "Runs parameter sensitivity sweeps (±10%, ±20%)",
      "Cross-validates on out-of-sample data",
      "Identifies overfit vs. robust parameter zones",
      "Rejects strategies with >1.5 instability score",
    ],
    metric: [
      { label: "Backtests run", value: "2,341" },
      { label: "Strategies approved", value: "47" },
    ],
    color: "text-purple-400",
    icon: <GitBranch className="w-5 h-5" />,
    gradient: "from-purple-500/20 to-pink-500/10",
  },
  {
    id: "hawk",
    name: "Hawk",
    title: "The Guardian",
    role: "Risk Sentinel",
    personality: "Sees everything. Forgives nothing. Pulls the kill switch at 3am.",
    status: "live",
    capabilities: [
      "Monitors every open position, every 30s",
      "Detects drawdown velocity spikes (>3% in 60s)",
      "Auto-tightens stops in volatility regimes",
      "Enforces kill-switch + position limits per user",
    ],
    metric: [
      { label: "Watching", value: "Live positions" },
      { label: "Latency", value: "<30s" },
    ],
    color: "text-emerald-400",
    icon: <Shield className="w-5 h-5" />,
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  {
    id: "press",
    name: "Press",
    title: "The Journalist",
    role: "News + Sentiment",
    personality: "Reads every headline. Filters the noise. Surfaces the signal.",
    status: "scanning",
    capabilities: [
      "Triages 1,000+ headlines per day",
      "Sentiment scoring per symbol (via Ollama)",
      "Macro context alerts (OPEC, EIA, Fed)",
      "Relevance filter based on your holdings",
    ],
    metric: [
      { label: "Stories analyzed", value: "1,247" },
      { label: "Avg relevance", value: "0.82" },
    ],
    color: "text-pink-400",
    icon: <Newspaper className="w-5 h-5" />,
    gradient: "from-pink-500/20 to-rose-500/10",
  },
  {
    id: "sage",
    name: "Sage",
    title: "The Curator",
    role: "Marketplace Quality",
    personality: "Tastes everything. Rejects most. Features only the sharpest.",
    status: "idle",
    capabilities: [
      "Reviews new marketplace strategies hourly",
      "Quality scoring (Sharpe + drawdown + complexity)",
      "Spam and curve-fit detection",
      "Auto-features top 10 by composite score",
    ],
    metric: [
      { label: "Reviewed today", value: "8 new" },
      { label: "Approval rate", value: "12%" },
    ],
    color: "text-cyan-400",
    icon: <Sparkles className="w-5 h-5" />,
    gradient: "from-cyan-500/20 to-sky-500/10",
  },
  {
    id: "argus",
    name: "Argus",
    title: "The Eye",
    role: "Arbitrage Scanner",
    personality: "Sees every spread. Spots the broken pairs. Calls the trade before anyone else.",
    status: "scanning",
    capabilities: [
      "Watches CL-BZ, GC-SI, HO-CL crack spreads",
      "Z-score based deviation alerts (>2σ)",
      "Generates pair-trade theses on demand",
      "Updates every 2 minutes during market hours",
    ],
    metric: [
      { label: "Spreads tracked", value: "6 pairs" },
      { label: "Last alert", value: "12min ago" },
    ],
    color: "text-violet-400",
    icon: <Eye className="w-5 h-5" />,
    gradient: "from-violet-500/20 to-fuchsia-500/10",
  },
  {
    id: "mercury",
    name: "Mercury",
    title: "The Herald",
    role: "Macro Event Tracker",
    personality: "Knows every Fed meeting, EIA report, OPEC decision before you do.",
    status: "scanning",
    capabilities: [
      "Tracks EIA crude inventories (every Wed 10:30 ET)",
      "FOMC, CPI, NFP, OPEC schedules loaded 30 days ahead",
      "Pre-event briefing 2hr before high-impact events",
      "Suggests strategy pause around macro shocks",
    ],
    metric: [
      { label: "Next event", value: "EIA crude (Wed)" },
      { label: "Tracked", value: "12 events / 30d" },
    ],
    color: "text-indigo-400",
    icon: <AlertTriangle className="w-5 h-5" />,
    gradient: "from-indigo-500/20 to-blue-500/10",
  },
  {
    id: "echo",
    name: "Echo",
    title: "The Mirror",
    role: "Behavioral Analyst",
    personality: "Reads your trade journal. Finds your patterns. Tells you the truth.",
    status: "idle",
    capabilities: [
      "Detects disposition effect (hold losers too long)",
      "Spots revenge trading within 1hr of a loss",
      "Finds your best day / worst symbol",
      "Weekly insights every Sunday at 8pm UTC",
    ],
    metric: [
      { label: "Patterns found", value: "5 archetypes" },
      { label: "Cadence", value: "Weekly" },
    ],
    color: "text-rose-400",
    icon: <BarChart3 className="w-5 h-5" />,
    gradient: "from-rose-500/20 to-pink-500/10",
  },
  {
    id: "compass",
    name: "Compass",
    title: "The Balancer",
    role: "Portfolio Rebalancer",
    personality: "Watches your exposure drift. Suggests trades to bring you back to target.",
    status: "idle",
    capabilities: [
      "Calculates drift from target allocation daily",
      "Generates specific rebalance trade list",
      "Three modes: alert / suggest / auto-trade (paper)",
      "Runs weekdays 4pm ET after US close",
    ],
    metric: [
      { label: "Threshold", value: "5% drift" },
      { label: "Cadence", value: "Daily" },
    ],
    color: "text-teal-400",
    icon: <Scale className="w-5 h-5" />,
    gradient: "from-teal-500/20 to-emerald-500/10",
  },
];

export default function AgentFleetSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

      <div className="relative max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase mb-4"
          >
            <Activity className="w-3 h-3" />
            Your AI trading team
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold tracking-tight leading-[1.05]"
          >
            Six specialists.<br />
            <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
              Zero hand-holding.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base lg:text-lg text-muted-foreground mt-5"
          >
            Each agent is a specialist with its own job, personality, and track record. They collaborate. They disagree. They back each other up. You stay in command.
          </motion.p>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className={`relative glass-card rounded-xl p-5 overflow-hidden hover:border-primary/40 transition-colors group`}
            >
              {/* Gradient backdrop */}
              <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-40 group-hover:opacity-60 transition-opacity`} />

              <div className="relative">
                {/* Header: avatar + name + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full bg-card border border-white/10 flex items-center justify-center ${a.color}`}>
                      {a.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base">{a.name}</h3>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.title}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{a.role}</div>
                    </div>
                  </div>
                  <StatusDot status={a.status} />
                </div>

                {/* Personality */}
                <p className="text-xs italic text-muted-foreground mb-4 leading-relaxed">
                  "{a.personality}"
                </p>

                {/* Capabilities */}
                <ul className="space-y-1.5 mb-4">
                  {a.capabilities.map((c, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs">
                      <Zap className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{c}</span>
                    </li>
                  ))}
                </ul>

                {/* Metrics */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  {a.metric.map((m, j) => (
                    <div key={j} className="flex-1">
                      <div className={`text-sm font-display font-bold ${a.color}`}>{m.value}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link href="/login">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer transition-colors">
              Meet the team in person
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">Free to start · Paper trade with $100k virtual capital</p>
        </motion.div>
      </div>
    </section>
  );
}

function StatusDot({ status }: { status: Agent["status"] }) {
  const config = {
    live: { color: "bg-emerald-500", label: "Live", ping: true },
    scanning: { color: "bg-amber-500", label: "Scanning", ping: true },
    idle: { color: "bg-zinc-500", label: "Idle", ping: false },
  }[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.ping && <div className={`absolute inset-0 rounded-full ${config.color} animate-ping opacity-75`} />}
      </div>
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{config.label}</span>
    </div>
  );
}