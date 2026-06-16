import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Bot, Activity, TrendingUp, TrendingDown, Zap, Shield, Clock } from "lucide-react";
import { agentsData } from "@/lib/mockData";

function HeartbeatPulse({ active }: { active: boolean }) {
  if (!active) return <div className="w-2 h-2 rounded-full bg-white/20" />;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
    </span>
  );
}

function AgentCard({ agent, index, inView }: { agent: typeof agentsData[0]; index: number; inView: boolean }) {
  const isRunning = agent.status === "running";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative glass-card rounded-2xl p-5 border transition-all duration-500 hover:border-primary/25 ${
        isRunning ? "border-white/8" : "border-white/5 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
            {agent.avatar}
          </div>
          <div>
            <div className="text-sm font-display font-bold text-foreground leading-tight">{agent.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{agent.asset}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <HeartbeatPulse active={isRunning} />
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isRunning ? "text-emerald-400" : "text-white/30"}`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Strategy badge */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 mb-4">
        <Zap className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-mono text-primary/80 font-medium">{agent.strategy}</span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily P&L</div>
          <div className={`text-base font-display font-bold ${agent.dailyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {agent.dailyPnl >= 0 ? "+" : ""}${(agent.dailyPnl / 1000).toFixed(1)}k
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-base font-display font-bold text-foreground">{agent.winRate}%</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Trades</div>
          <div className="text-base font-display font-bold text-foreground">{agent.tradeCount}</div>
        </div>
      </div>

      {/* Risk level + Uptime */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-mono">{agent.riskLevel} risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-mono">{agent.uptime}</span>
        </div>
      </div>

      {/* Running glow */}
      {isRunning && (
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.div>
  );
}

export default function AgentFleetSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const running = agentsData.filter((a) => a.status === "running");
  const totalDailyPnl = running.reduce((s, a) => s + a.dailyPnl, 0);
  const totalTrades = running.reduce((s, a) => s + a.tradeCount, 0);

  return (
    <section id="agents" className="py-24 lg:py-32 relative overflow-hidden" ref={ref}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/5 blur-[140px] rounded-full" />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 backdrop-blur-sm">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-[11px] font-sans font-bold tracking-wider uppercase">
              Autonomous Agents
            </span>
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Your AI Trading{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary">
              Agent Fleet
            </span>
          </h2>
          <p className="text-white/55 text-lg leading-relaxed">
            Deploy domain-specialized agents that trade crude oil, gold, natgas, and more — each with their own strategy, risk rules, and autonomous execution schedule.
          </p>
        </motion.div>

        {/* Fleet stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center gap-6 lg:gap-10 mb-12 px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/8"
        >
          {[
            { label: "Active Agents", value: String(running.length), icon: Bot, color: "text-emerald-400" },
            { label: "Fleet Daily P&L", value: `+$${(totalDailyPnl / 1000).toFixed(1)}k`, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Total Trades", value: totalTrades.toLocaleString(), icon: Activity, color: "text-primary" },
            { label: "Avg Uptime", value: "99.7%", icon: Clock, color: "text-blue-400" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <div>
                  <div className={`text-lg font-display font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Agent cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agentsData.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
