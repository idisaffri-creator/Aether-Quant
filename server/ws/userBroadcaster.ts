/**
 * WebSocket per-user broadcaster.
 * The existing tickBroadcaster broadcasts to all clients (e.g. price ticks).
 * This adds per-user channels for private events (fills, position updates).
 */
import { WebSocket } from "ws";

declare global {
  // eslint-disable-next-line no-var
  var __userSockets: Map<string, Set<WebSocket>> | undefined;
}

function getUserSockets(): Map<string, Set<WebSocket>> {
  if (!globalThis.__userSockets) globalThis.__userSockets = new Map();
  return globalThis.__userSockets;
}

/**
 * Register a socket for a specific user (extracted from JWT).
 * Each user has their own set of sockets (multiple tabs / devices).
 */
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
}

export function broadcastToUser(userId: string, payload: unknown): void {
  const m = getUserSockets();
  const set = m.get(userId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify(payload);
  let sent = 0;
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(data); sent++; } catch { /* ignore */ }
    }
  }
  if (sent > 0) {
    // Avoid log spam in production
  }
}

export function getUserSocketCount(userId: string): number {
  return getUserSockets().get(userId)?.size || 0;
}
