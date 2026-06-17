/**
 * Type definitions for Aether Energy domain entities.
 * Mock data has been removed — all UI now uses live API data.
 */
export interface AgentIdentity {
  id: string;
  name: string;
  personality: string;
  asset: string;
  strategy: string;
  status: "running" | "idle" | "error";
  dailyPnl: number;
  lastRun: number;
  metrics: { winRate: number; sharpe: number; trades: number };
}

export interface NotificationItem {
  id: string;
  type: "trade" | "signal" | "alert" | "system" | "position";
  title: string;
  message: string;
  read: boolean;
  metadata: any;
  createdAt: string;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  marketValue: number;
}
