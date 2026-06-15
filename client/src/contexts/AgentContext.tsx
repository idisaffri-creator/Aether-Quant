import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface AgentMetrics {
  tradesExecuted?: number;
  winRate?: number;
  alertsTriggered?: number;
  positionsMonitored?: number;
  signalsGenerated?: number;
  checksPassed?: number;
  flagsRaised?: number;
  rebalancesSuggested?: number;
  optimizationsRun?: number;
  running?: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: "idle" | "running" | "error" | "paused";
  lastRun: string | null;
  metrics: AgentMetrics;
}

interface AgentContextValue {
  agents: AgentInfo[];
  loading: boolean;
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const defaultAgents: AgentInfo[] = [
  { id: "aether-trade-01", name: "Trading Agent", status: "idle", lastRun: null, metrics: {} },
  { id: "aether-risk-01", name: "Risk Agent", status: "idle", lastRun: null, metrics: {} },
  { id: "aether-mkt-01", name: "Market Intelligence Agent", status: "idle", lastRun: null, metrics: {} },
  { id: "aether-comp-01", name: "Compliance Agent", status: "idle", lastRun: null, metrics: {} },
  { id: "aether-port-01", name: "Portfolio Agent", status: "idle", lastRun: null, metrics: {} },
  { id: "aether-sig-01", name: "Signal Agent", status: "idle", lastRun: null, metrics: {} },
];

const AgentContext = createContext<AgentContextValue>({
  agents: defaultAgents,
  loading: false,
  startAgent: async () => {},
  stopAgent: async () => {},
  refreshStatus: async () => {},
});

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<AgentInfo[]>(defaultAgents);
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("aether_token");
      const res = await fetch("/api/agents/status", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
    } catch {
      /* use defaults on error */
    } finally {
      setLoading(false);
    }
  }, []);

  const startAgent = useCallback(async (id: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "running" as const } : a)));
    try {
      const token = localStorage.getItem("aether_token");
      await fetch(`/api/agents/${id}/start`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "error" as const } : a)));
    }
  }, []);

  const stopAgent = useCallback(async (id: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "paused" as const } : a)));
    try {
      const token = localStorage.getItem("aether_token");
      await fetch(`/api/agents/${id}/stop`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AgentContext.Provider value={{ agents, loading, startAgent, stopAgent, refreshStatus }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  return useContext(AgentContext);
}
