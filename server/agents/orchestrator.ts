import { EventEmitter } from "events";
import { TradingAgent } from "./trading.js";
import { RiskAgent } from "./risk.js";
import { MarketIntelAgent } from "./marketIntel.js";
import { ComplianceAgent } from "./compliance.js";
import { PortfolioAgent } from "./portfolio.js";
import { SignalAgent } from "./signals.js";

export type AgentId = "trading" | "risk" | "market-intel" | "compliance" | "portfolio" | "signals";

interface AgentManifest {
  id: AgentId;
  name: string;
  agent: { start: () => Promise<void>; stop: () => Promise<void>; getStatus: () => any };
  status: "idle" | "running" | "error" | "paused";
  lastRun: string | null;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<AgentId, AgentManifest> = new Map();

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
}

export const orchestrator = new AgentOrchestrator();
