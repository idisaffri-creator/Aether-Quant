import { useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Bot, RefreshCw, BarChart3, GitCompare } from "lucide-react";
import { AgentStatus } from "@/components/agents/AgentStatus";
import { useAgentContext } from "@/contexts/AgentContext";
import BenchmarkPanel from "@/components/agents/BenchmarkPanel";
import AgentComparison from "@/components/agents/AgentComparison";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Intelligence() {
  usePageTitle("Intelligence");
  const { agents, loading, startAgent, stopAgent, refreshStatus } = useAgentContext();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Agent Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and orchestrate your AI trading agents
          </p>
        </div>
        <button
          onClick={refreshStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents"><Bot className="w-3.5 h-3.5" />AGENTS</TabsTrigger>
          <TabsTrigger value="benchmarks"><BarChart3 className="w-3.5 h-3.5" />BENCHMARKS</TabsTrigger>
          <TabsTrigger value="comparison"><GitCompare className="w-3.5 h-3.5" />COMPARISON</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
      {/* Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="w-4 h-4 text-amber" />
            Agent Orchestrator
          </div>
          <AgentStatus agents={agents} onStart={startAgent} onStop={stopAgent} />
        </div>

        {/* Agent Summary Cards */}
        <div className="space-y-4">
          <div className="text-sm font-semibold">Agent Metrics</div>
          {agents.map((agent) => (
            <div key={agent.id} className="glass-card rounded-xl p-4">
              <div className="text-xs font-medium mb-2">{agent.name}</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(agent.metrics).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="text-center p-2 rounded-lg bg-accent/30">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div className="text-sm font-mono font-bold mt-1">
                      {typeof value === "number" ? value.toLocaleString() : String(value)}
                    </div>
                  </div>
                ))}
                {Object.keys(agent.metrics).length === 0 && (
                  <div className="col-span-3 text-center text-[10px] text-muted-foreground py-4">
                    No metrics available. Start the agent to collect data.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-4">
          <BenchmarkPanel />
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <AgentComparison />
        </TabsContent>
      </Tabs>
    </div>
  );
}
