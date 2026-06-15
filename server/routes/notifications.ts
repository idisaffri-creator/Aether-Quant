import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

interface Notification {
  id: string;
  userId: string;
  type: "trade" | "signal" | "alert" | "system" | "position";
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const mockNotifications: Notification[] = [
  { id: "n1", userId: "u1", type: "trade", title: "Trade Executed", message: "Long 1,000 WTI @ $78.43 — filled successfully", read: false, metadata: { symbol: "WTI", side: "long", quantity: 1000, price: 78.43 }, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: "n2", userId: "u1", type: "signal", title: "New Signal: WTI Momentum", message: "Momentum strategy generated bullish signal on WTI with 78% confidence", read: false, metadata: { symbol: "WTI", confidence: 0.78, strategy: "Momentum" }, createdAt: new Date(Date.now() - 1200000).toISOString() },
  { id: "n3", userId: "u1", type: "alert", title: "Margin Alert", message: "WTI position approaching 8% of portfolio — review position sizing", read: false, metadata: { symbol: "WTI", exposure: 0.08, threshold: 0.1 }, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "n4", userId: "u1", type: "system", title: "OPEC Meeting Tomorrow", message: "OPEC+ meeting scheduled for July 5th — expect increased volatility", read: true, metadata: { event: "OPEC+ Meeting", date: "2026-07-05" }, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "n5", userId: "u1", type: "position", title: "Take Profit Alert", message: "BRENT position at +4.2% — take profit target of 5% approaching", read: false, metadata: { symbol: "BRENT", pnl: 4.2, target: 5 }, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: "n6", userId: "u1", type: "trade", title: "Stop Loss Triggered", message: "NGAS position stopped out at $2.08 — loss of $320", read: true, metadata: { symbol: "NGAS", loss: 320, price: 2.08 }, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "n7", userId: "u1", type: "system", title: "Platform Update", message: "Aether Energy v2.4 deployed — new analysis tools available", read: false, metadata: { version: "2.4.0" }, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "n8", userId: "u1", type: "signal", title: "Signal: WTI/Brent Spread", message: "Spread analysis suggests short WTI relative to Brent — deviation from mean", read: false, metadata: { spread: -3.42, deviation: 0.38 }, createdAt: new Date(Date.now() - 259200000).toISOString() },
];

router.get("/", authMiddleware, (_req, res) => {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  res.json({ notifications: mockNotifications, unreadCount });
});

router.put("/:id/read", authMiddleware, (req, res) => {
  const notif = mockNotifications.find((n) => n.id === req.params.id);
  if (!notif) {
    res.status(404).json({ code: "NOT_FOUND", message: "Notification not found", status: 404 });
    return;
  }
  notif.read = true;
  res.json({ notification: notif });
});

router.put("/read-all", authMiddleware, (_req, res) => {
  mockNotifications.forEach((n) => { n.read = true; });
  res.json({ message: "All notifications marked as read" });
});

export default router;
