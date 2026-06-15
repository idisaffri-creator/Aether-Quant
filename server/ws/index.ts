import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { MarketData, WSMessage } from "../../shared/types";

const MOCK_SYMBOLS = ["WTI", "BRENT", "NGAS", "GASOL", "BHEL"];

const mockPrices: Record<string, number> = {
  WTI: 78.43,
  BRENT: 82.17,
  NGAS: 2.14,
  GASOL: 2.51,
  BHEL: 68.90,
};

function generateMockMarketData(symbol: string): MarketData {
  const basePrice = mockPrices[symbol] || 50;
  const change = (Math.random() - 0.5) * 4;
  const price = basePrice + change;
  const change24h = ((price - basePrice) / basePrice) * 100;

  return {
    symbol,
    price: parseFloat(price.toFixed(2)),
    change24h: parseFloat(change24h.toFixed(2)),
    volume24h: parseFloat((Math.random() * 1000000 + 500000).toFixed(0)),
    high24h: parseFloat((price * 1.03).toFixed(2)),
    low24h: parseFloat((price * 0.97).toFixed(2)),
    bid: parseFloat((price * 0.999).toFixed(2)),
    ask: parseFloat((price * 1.001).toFixed(2)),
    spread: parseFloat((price * 0.002).toFixed(3)),
    timestamp: Date.now(),
  };
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }

      const quotes = MOCK_SYMBOLS.map(generateMockMarketData);
      const message: WSMessage = { type: "market", payload: quotes };
      ws.send(JSON.stringify(message));
    }, 2000);

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clearInterval(interval);
    });

    ws.on("error", () => {
      clearInterval(interval);
    });
  });

  return wss;
}
