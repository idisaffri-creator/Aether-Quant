import { EventEmitter } from "events";
import { orchestrator } from "../orchestrator.js";

export interface AgentMessage {
  id: string;
  from: string;
  to: string | "broadcast";
  type: "signal" | "alert" | "command" | "data" | "status" | "error";
  payload: unknown;
  timestamp: number;
  priority: "low" | "medium" | "high" | "critical";
  correlationId?: string;
}

export interface CommunicationEvent {
  message: AgentMessage;
  handled: boolean;
  handlers: string[];
}

type MessageHandler = (message: AgentMessage) => void | Promise<void>;

const agents = [
  "orchestrator", "trading", "risk", "market-intel", "compliance", "portfolio", "signals",
];

class CommunicationBus extends EventEmitter {
  private handlers = new Map<string, Set<MessageHandler>>();
  private history: AgentMessage[] = [];
  private maxHistory = 100;

  subscribe(agentId: string, handler: MessageHandler) {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set());
    }
    this.handlers.get(agentId)!.add(handler);
    return () => this.handlers.get(agentId)?.delete(handler);
  }

  subscribeToType(type: AgentMessage["type"], handler: MessageHandler) {
    const wrapped = (msg: AgentMessage) => {
      if (msg.type === type) handler(msg);
    };
    return this.subscribe("_type:" + type, wrapped);
  }

  async publish(message: Omit<AgentMessage, "id" | "timestamp">) {
    const msg: AgentMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    this.history.push(msg);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.emit("message", msg);

    const handlerNames: string[] = [];
    let handled = false;

    const targets = message.to === "broadcast" ? agents : [message.to];
    for (const target of targets) {
      const agentHandlers = this.handlers.get(target);
      if (agentHandlers) {
        const handlersArray = Array.from(agentHandlers);
        for (const handler of handlersArray) {
          try {
            await handler(msg);
            handlerNames.push(target);
            handled = true;
          } catch (err) {
            console.error(`[CommBus] Handler error for ${target}:`, err);
          }
        }
      }
    }

    this.emit("routed", { message: msg, handled, handlers: handlerNames });
    return msg;
  }

  getHistory(filter?: { from?: string; to?: string; type?: string }) {
    let result = this.history;
    if (filter?.from) result = result.filter((m) => m.from === filter.from);
    if (filter?.to) result = result.filter((m) => m.to === filter.to || m.to === "broadcast");
    if (filter?.type) result = result.filter((m) => m.type === filter.type);
    return result;
  }

  getStats() {
    const total = this.history.length;
    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    for (const msg of this.history) {
      byType[msg.type] = (byType[msg.type] || 0) + 1;
      byAgent[msg.from] = (byAgent[msg.from] || 0) + 1;
    }
    return { total, byType, byAgent };
  }
}

export const commBus = new CommunicationBus();

orchestrator.on("agent:started", ({ id, name }: { id: string; name: string }) => {
  commBus.publish({
    from: "orchestrator",
    to: "broadcast",
    type: "status",
    payload: { agentId: id, status: "running" },
    priority: "low",
  });
});

orchestrator.on("agent:stopped", ({ id, name }: { id: string; name: string }) => {
  commBus.publish({
    from: "orchestrator",
    to: "broadcast",
    type: "status",
    payload: { agentId: id, status: "paused" },
    priority: "low",
  });
});
