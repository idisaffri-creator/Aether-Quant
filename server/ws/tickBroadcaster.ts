/**
 * WebSocket tick broadcaster.
 * Sends a JSON message to all connected WS clients.
 * Used by ingest worker to push live price/news/signal updates.
 */
import { WebSocket } from "ws";
import { logger } from "../lib/logger";

// Maintain a set of active WS clients
declare global {
  // eslint-disable-next-line no-var
  var __wsClients: Set<WebSocket> | undefined;
}

function getClients(): Set<WebSocket> {
  if (!globalThis.__wsClients) globalThis.__wsClients = new Set();
  return globalThis.__wsClients;
}

export function registerClient(ws: WebSocket): void {
  getClients().add(ws);
  ws.on("close", () => getClients().delete(ws));
  ws.on("error", () => getClients().delete(ws));
  logger.debug({ size: getClients().size }, "ws client registered");
}

export function broadcastTick(payload: unknown): void {
  const data = JSON.stringify(payload);
  let sent = 0;
  for (const ws of getClients()) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
        sent++;
      } catch { /* ignore */ }
    }
  }
  if (sent > 0) {
    logger.debug({ sent, size: getClients().size }, "tick broadcast");
  }
}

export function getClientCount(): number {
  return getClients().size;
}
