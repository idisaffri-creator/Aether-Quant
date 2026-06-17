import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "../middleware/auth";
import { registerUserSocket } from "./userBroadcaster";
import { logger } from "../lib/logger";

/**
 * WebSocket protocol.
 *
 * Connect to: wss://host/ws
 * Optional auth: pass JWT as `?token=...` query param OR via first message
 *   { type: "auth", token: "..." }
 *
 * Server → Client:
 *   { type: "welcome", userId, ts }   after connect
 *   { type: "tick", data: { quotes: MarketData[] }, ts }  every 60s
 *   { type: "news", data: { articles, source }, ts }    every 30m
 *   { type: "order_filled", data: { orderId, ... }, ts } private, per-user
 *   { type: "order_cancelled", data: { orderId }, ts }  private, per-user
 *   { type: "position_update", data: { position }, ts }  private, per-user
 *   { type: "pong" }                                     response to ping
 *
 * Client → Server:
 *   { type: "auth", token: "..." }   to authenticate after connect
 *   { type: "ping" }                  keepalive
 */
export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    // Try to authenticate via ?token=... query param
    const url = new URL(req.url || "/", "http://localhost");
    const tokenFromQuery = url.searchParams.get("token");
    const userId = tokenFromQuery ? tryVerify(tokenFromQuery) : null;

    logger.info({ userId, ip: req.socket.remoteAddress }, "ws client connected");

    if (userId) {
      registerUserSocket(userId, ws);
    }
    ws.send(JSON.stringify({ type: "welcome", userId, ts: Date.now() }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        } else if (msg.type === "auth" && msg.token) {
          const uid = tryVerify(msg.token);
          if (uid) {
            registerUserSocket(uid, ws);
            ws.send(JSON.stringify({ type: "welcome", userId: uid, ts: Date.now() }));
          }
        }
      } catch { /* ignore malformed */ }
    });

    ws.on("close", () => {
      logger.debug("ws client disconnected");
    });
    ws.on("error", () => {
      // ignore
    });
  });

  return wss;
}

function tryVerify(token: string): string | null {
  try {
    const payload = verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}
