/*
 * Agent Team – "Meet the Agents" page
 * Inspired by Openclaw 101 SOUL.md pattern
 * Shows each agent as a team member with identity, skills, context, and schedule
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Shield,
  Clock,
  Database,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { agentsData } from "@/lib/mockData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function AgentIdentityCard({ agent }: { agent: typeof agentsData[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div variants={itemVariants}>
      <Card className={`bg-card border-border hover:border-primary/30 transition-all ${
        agent.status === "running" ? "glow-cyan-sm" : "opacity-70"
      }`}>
        <CardHeader className="pb-3">
          {/* Agent Header */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
              {agent.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-foreground text-base">
                  {agent.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    agent.status === "running"
                      ? "border-profit/40 text-profit bg-profit/5"
                      : "border-muted-foreground/40 text-muted-foreground bg-muted/30"
                  }`}
                >
                  {agent.status === "running" ? "Active" : "Offline"}
                </Badge>
              </div>
              <p className="text-sm text-primary font-medium mt-0.5">{agent.role}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {agent.personality}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-md bg-accent/50">
              <p className="text-xs text-muted-foreground">Trades</p>
              <p className="text-sm font-mono font-bold text-foreground">{agent.tradeCount}</p>
            </div>
            <div className="text-center p-2 rounded-md bg-accent/50">
              <p className="text-xs text-muted-foreground">Win%</p>
              <p className="text-sm font-mono font-bold text-foreground">{agent.winRate}%</p>
            </div>
            <div className="text-center p-2 rounded-md bg-accent/50">
              <p className="text-xs text-muted-foreground">P&L</p>
              <p className="text-sm font-mono font-bold text-profit">+${(agent.totalPnl / 1000).toFixed(1)}k</p>
            </div>
            <div className="text-center p-2 rounded-md bg-accent/50">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-sm font-mono font-bold text-foreground">{agent.uptime.split(" ")[0]}</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-[10px] font-mono border-primary/20 text-foreground bg-primary/5"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Rules</span>
            </div>
            <div className="space-y-1">
              {agent.rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary/60 mt-0.5">•</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Schedule</span>
            </div>
            <div className="space-y-1.5">
              {agent.schedule.slice(0, expanded ? undefined : 3).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono text-foreground">{s.time}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              Heartbeat: {agent.heartbeatPattern}
            </p>
          </div>

          {/* Expandable Context System */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-accent/30 hover:bg-accent/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide Context System" : "View Context System (SOUL.md)"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Market Context */}
                <div className="p-3 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Database className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                      Market Context
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.context.market.map((feed, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] font-mono border-border text-muted-foreground">
                        {feed}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Strategy Context */}
                <div className="p-3 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                      Strategy Context (ATEE)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    {agent.context.strategy}
                  </p>
                </div>

                {/* Risk Context */}
                <div className="p-3 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className="w-3 h-3 text-loss" />
                    <span className="text-[10px] font-semibold text-loss uppercase tracking-wider">
                      Risk Context
                    </span>
                  </div>
                  <div className="space-y-1">
                    {agent.context.risk.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                    ))}
                  </div>
                </div>

                {/* Memory */}
                <div className="p-3 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3 h-3 text-profit" />
                    <span className="text-[10px] font-semibold text-profit uppercase tracking-wider">
                      Memory (Lessons Learned)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {agent.context.memory.map((m, i) => (
                      <p key={i} className="text-xs text-muted-foreground italic">"{m}"</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AgentTeam() {
  const activeAgents = agentsData.filter((a) => a.status === "running");
  const stoppedAgents = agentsData.filter((a) => a.status === "stopped");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Meet the Agent Team
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your autonomous trading workforce — each agent has a unique identity, skills, and context system (SOUL.md pattern).
        </p>
      </div>

      {/* Team Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-primary font-medium">{activeAgents.length} Active</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent border border-border">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono text-muted-foreground">{stoppedAgents.length} Offline</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-profit/5 border border-profit/20">
          <Zap className="w-4 h-4 text-profit" />
          <span className="text-sm font-mono text-profit">
            {agentsData.reduce((sum, a) => sum + a.skills.length, 0)} Total Skills
          </span>
        </div>
      </div>

      {/* Agent Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      >
        {agentsData.map((agent) => (
          <AgentIdentityCard key={agent.id} agent={agent} />
        ))}
      </motion.div>
    </div>
  );
}
