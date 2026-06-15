import { Play, Pause, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import type { AgentInfo } from "@/contexts/AgentContext";

interface AgentStatusProps {
  agents: AgentInfo[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}

const statusConfig = {
  running: { icon: Activity, color: "text-green-500", bg: "bg-green-500/10", label: "Running" },
  idle: { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-accent/30", label: "Idle" },
  paused: { icon: Pause, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Paused" },
  error: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", label: "Error" },
};

export function AgentStatus({ agents, onStart, onStop }: AgentStatusProps) {
  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const config = statusConfig[agent.status as keyof typeof statusConfig] || statusConfig.idle;
        const Icon = config.icon;

        return (
          <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg glass-card">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div>
                <div className="text-xs font-medium">{agent.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                  {agent.lastRun && (
                    <span className="text-[10px] text-muted-foreground">
                      · {new Date(agent.lastRun).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {agent.status === "running" ? (
                <button
                  onClick={() => onStop(agent.id)}
                  className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => onStart(agent.id)}
                  className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
