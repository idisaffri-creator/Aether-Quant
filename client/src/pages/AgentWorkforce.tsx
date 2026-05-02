/*
 * Agent Workforce Dashboard v3 – Enhanced with SOUL.md Identity
 * Autonomous trading agents with P&L attribution, identity cards, per-agent and global kill switches
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Power,
  PowerOff,
  ChevronRight,
  AlertTriangle,
  Shield,
  DollarSign,
  TrendingUp,
  Clock,
  Activity,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  Database,
  Target,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { agentsData, agentTradeLogs, type AgentIdentity } from "@/lib/mockData";

function formatHeartbeat(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function AgentCard({
  agent,
  onToggle,
  onViewLog,
}: {
  agent: AgentIdentity;
  onToggle: () => void;
  onViewLog: () => void;
}) {
  const [showContext, setShowContext] = useState(false);

  return (
    <Card
      className={`bg-card border-border hover:border-primary/30 transition-all ${
        agent.status === "running" ? "glow-cyan-sm" : "opacity-75"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg shrink-0">
              {agent.avatar}
            </div>
            <div>
              <CardTitle className="text-sm font-display font-semibold text-foreground">
                {agent.name}
              </CardTitle>
              <p className="text-xs text-primary font-medium">{agent.role}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {agent.asset}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-mono ${
              agent.status === "running"
                ? "border-profit/40 text-profit bg-profit/5"
                : "border-muted-foreground/40 text-muted-foreground bg-muted/30"
            }`}
          >
            {agent.status === "running" ? "Running" : "Stopped"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Daily P&L */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily P&L</p>
          <p
            className={`text-xl font-mono font-bold ${
              agent.dailyPnl >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {agent.dailyPnl >= 0 ? "+" : ""}${Math.abs(agent.dailyPnl).toLocaleString()}
          </p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Total P&L</span>
            <p className="font-mono font-semibold text-profit">+${agent.totalPnl.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground"># Trades</span>
            <p className="font-mono font-semibold text-foreground">{agent.tradeCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Uptime</span>
            <p className="font-mono font-semibold text-foreground">{agent.uptime}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Win Rate</span>
            <p className="font-mono font-semibold text-foreground">{agent.winRate}%</p>
          </div>
        </div>

        {/* Skills (compact) */}
        <div className="flex flex-wrap gap-1">
          {agent.skills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="text-[9px] font-mono border-primary/20 text-primary/80 bg-primary/5"
            >
              {skill}
            </Badge>
          ))}
          {agent.skills.length > 3 && (
            <Badge variant="outline" className="text-[9px] font-mono border-border text-muted-foreground">
              +{agent.skills.length - 3} more
            </Badge>
          )}
        </div>

        {/* P&L Attribution Panel */}
        <div className="p-2.5 rounded-md bg-accent/50 border border-border/50 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
              Outcome Attribution
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Value Generated</span>
            <span className="font-mono font-semibold text-profit">
              ${agent.cumulativeValue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Performance Fee (10%)</span>
            <span className="font-mono font-semibold text-foreground">
              ${agent.performanceFee.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Domain Intelligence */}
        <div className="flex items-start gap-2 text-xs">
          <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <p className="text-muted-foreground leading-snug">{agent.domainPersona}</p>
        </div>

        {/* Context toggle */}
        <button
          onClick={() => setShowContext(!showContext)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-md bg-accent/30 hover:bg-accent/50 transition-colors text-[10px] text-muted-foreground hover:text-foreground"
        >
          {showContext ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          {showContext ? "Hide SOUL.md" : "View SOUL.md Context"}
        </button>

        <AnimatePresence>
          {showContext && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 overflow-hidden"
            >
              <div className="p-2 rounded bg-accent/30 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <Database className="w-2.5 h-2.5 text-primary" />
                  <span className="text-[9px] text-primary font-semibold uppercase">Market Feeds</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {agent.context.market.join(" • ")}
                </p>
              </div>
              <div className="p-2 rounded bg-accent/30 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-2.5 h-2.5 text-primary" />
                  <span className="text-[9px] text-primary font-semibold uppercase">Strategy</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{agent.context.strategy}</p>
              </div>
              <div className="p-2 rounded bg-accent/30 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <Shield className="w-2.5 h-2.5 text-loss" />
                  <span className="text-[9px] text-loss font-semibold uppercase">Risk Limits</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {agent.context.risk.join(" | ")}
                </p>
              </div>
              <div className="p-2 rounded bg-accent/30 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <BookOpen className="w-2.5 h-2.5 text-profit" />
                  <span className="text-[9px] text-profit font-semibold uppercase">Memory</span>
                </div>
                {agent.context.memory.map((m, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground italic">• {m}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[9px] font-mono border-border">
              {agent.riskLevel} Risk
            </Badge>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-2.5 h-2.5" />
              Beat: {formatHeartbeat(agent.lastHeartbeat)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              className={`p-1.5 rounded-md transition-colors ${
                agent.status === "running"
                  ? "hover:bg-loss/10 text-loss"
                  : "hover:bg-profit/10 text-profit"
              }`}
              title={agent.status === "running" ? "Stop Agent" : "Start Agent"}
            >
              {agent.status === "running" ? (
                <Power className="w-3.5 h-3.5" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onViewLog}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="View Trade Log"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentWorkforce() {
  const [agents, setAgents] = useState(agentsData);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [tradeLogOpen, setTradeLogOpen] = useState(false);

  const activeCount = agents.filter((a) => a.status === "running").length;
  const totalDailyPnl = agents
    .filter((a) => a.status === "running")
    .reduce((sum, a) => sum + a.dailyPnl, 0);
  const totalValue = agents.reduce((sum, a) => sum + a.cumulativeValue, 0);

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "running" ? ("stopped" as const) : ("running" as const) }
          : a
      )
    );
    const agent = agents.find((a) => a.id === id);
    if (agent) {
      toast.success(
        agent.status === "running"
          ? `${agent.name} agent stopped`
          : `${agent.name} agent activated`
      );
    }
  };

  const killAllAgents = () => {
    setAgents((prev) => prev.map((a) => ({ ...a, status: "stopped" as const })));
    toast.error("GLOBAL KILL SWITCH ACTIVATED — All agents stopped");
  };

  const openTradeLog = (id: string) => {
    setSelectedAgent(id);
    setTradeLogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with global controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Agent Workforce Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Where AI Agents Become Your Trading Workforce
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-mono">
            <div className="w-2 h-2 rounded-full bg-profit animate-pulse-glow" />
            <span className="text-foreground">{activeCount} active</span>
            <span className="text-muted-foreground mx-1">|</span>
            <span className={totalDailyPnl >= 0 ? "text-profit" : "text-loss"}>
              Daily P&L: {totalDailyPnl >= 0 ? "+" : ""}${totalDailyPnl.toLocaleString()}
            </span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-loss/50 text-loss hover:bg-loss/10 hover:text-loss font-display gap-2"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Global Kill Switch
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground font-display flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-loss" />
                  Activate Global Kill Switch?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will immediately stop ALL running agents. Open positions will NOT be closed automatically.
                  You will need to manually restart each agent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-secondary text-foreground border-border">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={killAllAgents}
                  className="bg-loss text-white hover:bg-loss/90"
                >
                  Kill All Agents
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Risk overlay banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20"
      >
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-semibold">Risk Overlay Active</span> — All orders pass through position limits, daily loss limits, and correlation checks before execution.
        </p>
      </motion.div>

      {/* Total Value Generated */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-profit/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-profit" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value Generated</p>
              <p className="text-lg font-mono font-bold text-profit">${totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Workforce Size</p>
              <p className="text-lg font-mono font-bold text-foreground">{agents.length} agents</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Performance Fee (10%)</p>
              <p className="text-lg font-mono font-bold text-foreground">${Math.round(totalValue * 0.1).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent, idx) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <AgentCard
              agent={agent}
              onToggle={() => toggleAgent(agent.id)}
              onViewLog={() => openTradeLog(agent.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Trade Log Dialog */}
      <Dialog open={tradeLogOpen} onOpenChange={setTradeLogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              Trade Log — {agents.find((a) => a.id === selectedAgent)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {selectedAgent && agentTradeLogs[selectedAgent] ? (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-2">Time</th>
                    <th className="text-left py-2 px-2">Action</th>
                    <th className="text-right py-2 px-2">Price</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {agentTradeLogs[selectedAgent].map((log) => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-accent/30">
                      <td className="py-2 px-2 text-muted-foreground">{log.time}</td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            log.action.includes("BUY")
                              ? "border-profit/40 text-profit"
                              : "border-loss/40 text-loss"
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right text-foreground">${log.price.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-foreground">{log.quantity}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${
                        log.pnl === null
                          ? "text-muted-foreground"
                          : log.pnl >= 0
                          ? "text-profit"
                          : "text-loss"
                      }`}>
                        {log.pnl === null ? "—" : `${log.pnl >= 0 ? "+" : ""}$${log.pnl.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No trade logs available for this agent.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
