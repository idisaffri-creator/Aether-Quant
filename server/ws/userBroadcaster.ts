/**
 * WebSocket per-user broadcaster with Redis pub/sub.
 *
 * In single-process mode, uses in-process Map.
 * In multi-process mode (PM2 cluster), uses Redis pub/sub so all instances
 * can broadcast to a user's sockets regardless of which process owns them.
 *
 * No sticky sessions required — the WS client just connects to any instance.
 */
import { WebSocket } from "ws";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

const CHANNEL = "aether:ws:user";

declare global {
  // eslint-disable-next-line no-var
  var __userSockets: Map<string, Set<WebSocket>> | undefined;
  // eslint-disable-next-line no-var
  var __subscriberStarted: boolean | undefined;
}

function getUserSockets(): Map<string, Set<WebSocket>> {
  if (!globalThis.__userSockets) globalThis.__userSockets = new Map();
  return globalThis.__userSockets;
}

let subscriberStarted = false;

async function startSubscriber() {
  if (subscriberStarted) return;
  subscriberStarted = true;
  try {
    const sub = redis.duplicate();
    await sub.subscribe(CHANNEL);
    sub.on("message", (channel, raw) => {
      if (channel !== CHANNEL) return;
      try {
        const { userId, payload } = JSON.parse(raw) as { userId: string; payload: unknown };
        const set = getUserSockets().get(userId);
        if (!set || set.size === 0) return;
        const data = JSON.stringify(payload);
        for (const ws of set) {
          if (ws.readyState === WebSocket.OPEN) {
            try { ws.send(data); } catch { /* ignore */ }
          }
        }
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "ws pubsub message parse failed");
      }
    });
    logger.info("ws pubsub subscriber started");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "ws pubsub subscriber failed (single-process mode)");
  }
}

export function registerUserSocket(userId: string, ws: WebSocket): void {
  const m = getUserSockets();
  if (!m.has(userId)) m.set(userId, new Set());
  m.get(userId)!.add(ws);
  ws.on("close", () => {
    m.get(userId)?.delete(ws);
    if (m.get(userId)?.size === 0) m.delete(userId);
  });
  ws.on("error", () => {
    m.get(userId)?.delete(ws);
  });
  // Lazy start subscriber on first socket
  if (process.env.NODE_ENV === "production" && !subscriberStarted) {
    startSubscriber().catch(() => {});
  }
}

export async function broadcastToUser(userId: string, payload: unknown): Promise<void> {
  // Try Redis pub/sub first (cross-process), fall back to local
  if (process.env.NODE_ENV === "production" && subscriberStarted) {
    try {
      await redis.publish(CHANNEL, JSON.stringify({ userId, payload }));
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "ws pubsub publish failed, using local");
    }
  }
  const m = getUserSockets();
  const set = m.get(userId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(data); } catch { /* ignore */ }
    }
  }
}

export function getUserSocketCount(userId: string): number {
  return getUserSockets().get(userId)?.size || 0;
}

export function getTotalSocketCount(): number {
  let n = 0;
  for (const set of getUserSockets().values()) n += set.size;
  return n;
}
