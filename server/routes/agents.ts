import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

interface AgentStatus {
  id: string;
  name: string;
  status: "idle" | "running" | "error" | "paused";
  lastRun: string | null;
  metrics: Record<string, number>;
}

interface SignalBody {
  id: string;
  symbol: string;
  direction: "long" | "short";
  confidence: number;
  strategy: string;
  reason: string;
  timestamp: number;
  acknowledged: boolean;
}

const agentStatuses: AgentStatus[] = [
  { id: "aether-trade-01", name: "Trading Agent", status: "idle", lastRun: null, metrics: { tradesExecuted: 0, winRate: 0 } },
  { id: "aether-risk-01", name: "Risk Agent", status: "idle", lastRun: null, metrics: { alertsTriggered: 0, positionsMonitored: 0 } },
  { id: "aether-mkt-01", name: "Market Intelligence Agent", status: "idle", lastRun: null, metrics: { signalsGenerated: 0, accuracy: 0 } },
  { id: "aether-comp-01", name: "Compliance Agent", status: "idle", lastRun: null, metrics: { checksPassed: 0, flagsRaised: 0 } },
  { id: "aether-port-01", name: "Portfolio Agent", status: "idle", lastRun: null, metrics: { rebalancesSuggested: 0, optimizationsRun: 0 } },
  { id: "aether-sig-01", name: "Signal Agent", status: "idle", lastRun: null, metrics: { signalsGenerated: 0, activeSignals: 0 } },
];

const mockSignals: SignalBody[] = [
  {
    id: "sig-mock-001",
    symbol: "WTI",
    direction: "long",
    confidence: 0.78,
    strategy: "Momentum",
    reason: "WTI short-term MA crossed above long-term MA with strong RSI momentum.",
    timestamp: Date.now() - 120000,
    acknowledged: false,
  },
  {
    id: "sig-mock-002",
    symbol: "BRENT",
    direction: "short",
    confidence: 0.65,
    strategy: "Mean Reversion",
    reason: "BRENT z-score 2.1 — price significantly above historical mean.",
    timestamp: Date.now() - 300000,
    acknowledged: false,
  },
  {
    id: "sig-mock-003",
    symbol: "NGAS",
    direction: "long",
    confidence: 0.71,
    strategy: "Volume Breakout",
    reason: "NGAS volume spike 2.4x average with bullish price move of 0.85%.",
    timestamp: Date.now() - 60000,
    acknowledged: false,
  },
];

router.get("/status", authMiddleware, (_req, res) => {
  res.json({ agents: agentStatuses });
});

router.post("/:id/start", authMiddleware, (req, res) => {
  const agent = agentStatuses.find((a) => a.id === req.params.id);
  if (!agent) {
    res.status(404).json({ code: "NOT_FOUND", message: "Agent not found", status: 404 });
    return;
  }
  agent.status = "running";
  agent.lastRun = new Date().toISOString();
  res.json({ message: `Agent ${agent.name} started`, agent });
});

router.post("/:id/stop", authMiddleware, (req, res) => {
  const agent = agentStatuses.find((a) => a.id === req.params.id);
  if (!agent) {
    res.status(404).json({ code: "NOT_FOUND", message: "Agent not found", status: 404 });
    return;
  }
  agent.status = "paused";
  res.json({ message: `Agent ${agent.name} paused`, agent });
});

router.get("/signals", authMiddleware, (_req, res) => {
  const active = mockSignals.filter((s) => !s.acknowledged);
  res.json({ signals: active });
});

router.post("/signals/:id/acknowledge", authMiddleware, (req, res) => {
  const signal = mockSignals.find((s) => s.id === req.params.id);
  if (!signal) {
    res.status(404).json({ code: "NOT_FOUND", message: "Signal not found", status: 404 });
    return;
  }
  signal.acknowledged = true;
  res.json({ message: "Signal acknowledged", signal });
});

export default router;
