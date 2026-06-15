import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  category: "trade" | "auth" | "setting" | "strategy" | "admin";
  details: string;
  ip: string;
  timestamp: string;
}

const mockAudit: AuditEntry[] = [
  { id: "a1", userId: "u1", action: "Trade Executed", category: "trade", details: "Long 1,000 WTI @ $78.43 via Market order", ip: "192.168.1.1", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "a2", userId: "u1", action: "Login", category: "auth", details: "Login from Chrome 125 on Windows", ip: "203.0.113.42", timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: "a3", userId: "u1", action: "Strategy Updated", category: "strategy", details: "Momentum Breakout — stop-loss changed from 2.5% to 3.0%", ip: "192.168.1.1", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "a4", userId: "u1", action: "Stop Loss Triggered", category: "trade", details: "NGAS position stopped out at $2.08 — loss of $320", ip: "system", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "a5", userId: "u1", action: "Password Changed", category: "setting", details: "Account password updated successfully", ip: "203.0.113.42", timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: "a6", userId: "u1", action: "API Key Created", category: "setting", details: "New API key 'Market Data Feed' generated", ip: "192.168.1.1", timestamp: new Date(Date.now() - 28800000).toISOString() },
  { id: "a7", userId: "u1", action: "Portfolio Rebalanced", category: "trade", details: "NGAS allocation increased from 12% to 15.8%; BHEL reduced from 18% to 15.6%", ip: "system", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "a8", userId: "u1", action: "Strategy Deployed", category: "strategy", details: "Volatility Arbitrage strategy activated on WTI and BRENT", ip: "192.168.1.1", timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: "a9", userId: "u1", action: "Risk Alert Acknowledged", category: "admin", details: "Margin alert acknowledged — WTI position at 7.8% of portfolio", ip: "system", timestamp: new Date(Date.now() - 259200000).toISOString() },
  { id: "a10", userId: "u1", action: "Login Failed", category: "auth", details: "Failed login attempt from unrecognized device", ip: "198.51.100.23", timestamp: new Date(Date.now() - 345600000).toISOString() },
];

router.get("/", authMiddleware, (req, res) => {
  const category = req.query.category as string | undefined;
  let result = mockAudit;
  if (category) result = result.filter((e) => e.category === category);
  res.json({ entries: result });
});

export default router;
