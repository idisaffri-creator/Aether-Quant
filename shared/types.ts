export interface User {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
  createdAt: string;
  tier: 'free' | 'professional' | 'enterprise';
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  config: StrategyConfig;
  performance?: StrategyPerformance;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface StrategyConfig {
  entryConditions: Condition[];
  exitConditions: Condition[];
  riskParams: RiskParameters;
  assets: string[];
}

export interface Condition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'crosses_above' | 'crosses_below';
  value: number;
  indicator?: string;
}

export interface RiskParameters {
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxDrawdown: number;
}

export interface StrategyPerformance {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  totalReturn: number;
}

export interface Trade {
  id: string;
  userId: string;
  strategyId?: string;
  asset: string;
  side: 'long' | 'short';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  status: 'open' | 'closed' | 'cancelled';
  openedAt: string;
  closedAt?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  pnlPercent: number;
  openPositions: number;
  availableBalance: number;
  allocation: AssetAllocation[];
}

export interface AssetAllocation {
  asset: string;
  value: number;
  percentage: number;
  pnl: number;
}

export interface WSMessage {
  type: 'market' | 'trade' | 'orderbook' | 'portfolio' | 'error';
  payload: unknown;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  confidence: number;
  strategy: string;
  reason: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface MailMessage {
  id: string;
  from: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  timestamp: number;
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
  category: string;
  folder: string;
}

export interface MailFolder {
  id: string;
  label: string;
  count: number;
}
