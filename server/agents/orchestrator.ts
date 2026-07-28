import { EventEmitter } from "events";
import { TradingAgent } from "./trading.js";
import { RiskAgent } from "./risk.js";
import { MarketIntelAgent } from "./marketIntel.js";
import { ComplianceAgent } from "./compliance.js";
import { PortfolioAgent } from "./portfolio.js";
import { SignalAgent } from "./signals.js";
import { recordCostEvent, syntheticCost } from "../services/finops/costTracker.js";

export type AgentId = "trading" | "risk" | "market-intel" | "compliance" | "portfolio" | "signals";

interface AgentManifest {
  id: AgentId;
  name: string;
  agent: { start: () => Promise<void>; stop: () => Promise<void>; getStatus: () => any };
  status: "idle" | "running" | "error" | "paused";
  lastRun: string | null;
}

/**
 * A single Observe → Think → Act → Check cycle for a managed agent, with
 * per-phase and total duration in ms (Foundation Engineering requirement:
 * decision latency should stay well under the 2s SLA).
 */
export interface CycleRecord {
  at: string;
  observeMs: number;
  thinkMs: number;
  actMs: number;
  checkMs: number;
  totalMs: number;
}

const MAX_CYCLES_PER_AGENT = 20;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randMs(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<AgentId, AgentManifest> = new Map();
  private cycles: Map<AgentId, CycleRecord[]> = new Map();

  constructor() {
    super();
    this.register("trading", "Trading Agent", new TradingAgent());
    this.register("risk", "Risk Agent", new RiskAgent());
    this.register("market-intel", "Market Intelligence Agent", new MarketIntelAgent());
    this.register("compliance", "Compliance Agent", new ComplianceAgent());
    this.register("portfolio", "Portfolio Agent", new PortfolioAgent());
    this.register("signals", "Signal Agent", new SignalAgent());
  }

  private register(id: AgentId, name: string, agent: any) {
    this.agents.set(id, { id, name, agent, status: "idle", lastRun: null });
  }

  async startAgent(id: AgentId) {
    const manifest = this.agents.get(id);
    if (!manifest) throw new Error(`Agent ${id} not found`);

    try {
      manifest.status = "running";
      manifest.lastRun = new Date().toISOString();
      await manifest.agent.start();
      this.emit("agent:started", { id, name: manifest.name });
    } catch (error) {
      manifest.status = "error";
      this.emit("agent:error", { id, error });
    }
  }

  async stopAgent(id: AgentId) {
    const manifest = this.agents.get(id);
    if (!manifest) throw new Error(`Agent ${id} not found`);

    try {
      await manifest.agent.stop();
      manifest.status = "paused";
      this.emit("agent:stopped", { id, name: manifest.name });
    } catch (error) {
      this.emit("agent:error", { id, error });
    }
  }

  getStatus() {
    const statuses: any[] = [];
    Array.from(this.agents.entries()).forEach(([, manifest]) => {
      statuses.push({
        id: manifest.id,
        name: manifest.name,
        status: manifest.status,
        lastRun: manifest.lastRun,
        metrics: manifest.agent.getStatus(),
      });
    });
    return statuses;
  }

  getAgent(id: AgentId) {
    return this.agents.get(id)?.agent;
  }

  async broadcast(message: string) {
    this.emit("broadcast", message);
  }

  /**
   * Run one Observe → Think → Act → Check cycle for a managed agent.
   * Each phase does a small bit of realistic async work (in a real system
   * this would be: pull market/position state, evaluate a decision, submit
   * the action, verify risk bounds) — here the delays are simulated but
   * bounded so the total cycle always stays well under the 2s decision
   * latency SLA. Every cycle also records a small simulated AI/infra cost
   * event (see server/services/finops/costTracker.ts — no real billing
   * meter exists yet).
   */
  async runCycle(id: AgentId): Promise<CycleRecord> {
    const manifest = this.agents.get(id);
    if (!manifest) throw new Error(`Agent ${id} not found`);

    const t0 = Date.now();
    await delay(randMs(5, 40)); // Observe: pull latest market/position state
    const t1 = Date.now();
    await delay(randMs(10, 60)); // Think: evaluate signal/decision
    const t2 = Date.now();
    await delay(randMs(5, 30)); // Act: submit action (no-op here unless agent.start() drives real execution)
    const t3 = Date.now();
    await delay(randMs(5, 25)); // Check: verify outcome / risk bounds
    const t4 = Date.now();

    const record: CycleRecord = {
      at: new Date(t0).toISOString(),
      observeMs: t1 - t0,
      thinkMs: t2 - t1,
      actMs: t3 - t2,
      checkMs: t4 - t3,
      totalMs: t4 - t0,
    };

    const list = this.cycles.get(id) || [];
    list.push(record);
    while (list.length > MAX_CYCLES_PER_AGENT) list.shift();
    this.cycles.set(id, list);

    // Best-effort, never blocks/throws on the caller.
    void recordCostEvent({ agentKey: id, costType: "ai_model", amountUsd: syntheticCost("ai_model") });

    this.emit("agent:cycle", { id, record });
    return record;
  }

  getCycles(id: AgentId): CycleRecord[] {
    return this.cycles.get(id) || [];
  }

  getLastCycle(id: AgentId): CycleRecord | null {
    const list = this.cycles.get(id);
    return list && list.length ? list[list.length - 1] : null;
  }
}

export const orchestrator = new AgentOrchestrator();
