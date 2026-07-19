import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { orchestrator, type AgentId, type CycleRecord } from "../agents/orchestrator";

const router = Router();

// Maps the 6 roster agent ids exposed here (used by the frontend AgentContext
// since PRD v2/v3) to the orchestrator's internal AgentId — both cover the
// same 6 roles, they just predate each other and use different id schemes.
const ORCHESTRATOR_ID_MAP: Record<string, AgentId> = {
  "aether-trade-01": "trading",
  "aether-risk-01": "risk",
  "aether-mkt-01": "market-intel",
  "aether-comp-01": "compliance",
  "aether-port-01": "portfolio",
  "aether-sig-01": "signals",
};

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

router.get("/status", authMiddleware, async (_req, res) => {
  // Run a fresh Observe→Think→Act→Check cycle for each roster agent in
  // parallel (each cycle is bounded to well under 2s — see orchestrator.ts)
  // so the status response always carries a recent `lastCycle`.
  try {
    await Promise.all(
      Object.values(ORCHESTRATOR_ID_MAP).map((oid) => orchestrator.runCycle(oid).catch(() => null))
    );
  } catch {
    /* best-effort — status still returns without fresh cycles */
  }

  const withCycles = agentStatuses.map((a) => {
    const oid = ORCHESTRATOR_ID_MAP[a.id];
    const lastCycle = oid ? orchestrator.getLastCycle(oid) : null;
    return { ...a, lastCycle };
  });
  res.json({ agents: withCycles });
});

/**
 * GET /api/agents/:id/cycles
 * Last N Observe→Think→Act→Check cycles for a roster agent (Foundation
 * Engineering — decision-latency observability).
 */
router.get("/:id/cycles", authMiddleware, (req, res) => {
  const oid = ORCHESTRATOR_ID_MAP[req.params.id];
  if (!oid) {
    res.status(404).json({ code: "NOT_FOUND", message: "Agent not found", status: 404 });
    return;
  }
  const cycles: CycleRecord[] = orchestrator.getCycles(oid);
  res.json({ agentId: req.params.id, cycles, lastCycle: cycles.length ? cycles[cycles.length - 1] : null });
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
