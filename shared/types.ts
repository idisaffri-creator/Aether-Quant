export interface UserPreferences {
  notifications?: {
    tradeExecutions?: boolean;
    priceAlerts?: boolean;
    strategySignals?: boolean;
    portfolioUpdates?: boolean;
    emailDigest?: boolean;
    pushNotifications?: boolean;
  };
  appearance?: {
    theme?: "dark" | "light" | "system";
    density?: "comfortable" | "compact";
  };
  privacy?: {
    showProfile?: boolean;
    showActivity?: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
  createdAt: string;
  lastLoginAt?: string;
  tier: 'free' | 'professional' | 'enterprise' | 'admin';
  role?: 'user' | 'admin';
  status?: 'active' | 'suspended' | 'pending';
  emailVerified?: boolean;
  preferences?: UserPreferences;
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

export type AdminMailCategory = 'lead' | 'marketing' | 'support' | 'blast' | 'system' | 'general' | 'sales' | 'partnership';
export type AdminMailFolder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'leads' | 'marketing' | 'support' | 'blasts' | 'archive' | 'scheduled';

export interface AdminMailMessage {
  id: string;
  threadId?: string;
  from: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  preview: string;
  body: string;
  folder: AdminMailFolder;
  category: AdminMailCategory;
  status: 'unread' | 'read' | 'replied' | 'forwarded' | 'archived' | 'spam' | 'trash';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  starred: boolean;
  hasAttachments: boolean;
  attachments?: { name: string; size: number; type: string }[];
  tags?: string[];
  campaignId?: string;
  contactId?: string;
  inReplyTo?: string;
  date: string;
  timestamp: number;
  readAt?: string | null;
  repliedAt?: string | null;
  snoozedUntil?: number | null;
  openedAt?: string | null;
  clickedAt?: string | null;
}

export interface AdminMailSnippet {
  id: string;
  name: string;
  subject?: string;
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminMailContact {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  phone?: string;
  source: 'website' | 'referral' | 'campaign' | 'manual' | 'event' | 'social' | 'cold_outreach';
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'customer' | 'unsubscribed';
  tags: string[];
  notes?: string;
  lastContactedAt?: string | null;
  createdAt: string;
  meta?: {
    location?: string;
    interest?: 'platform' | 'api' | 'enterprise' | 'partnership' | 'support' | 'other';
    budget?: string;
    timeline?: string;
  };
}

export interface AdminMailTemplate {
  id: string;
  name: string;
  category: AdminMailCategory;
  subject: string;
  body: string;
  variables: string[];
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

export interface AdminMailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: AdminMailCategory;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
  audience: {
    contactIds: string[];
    tags: string[];
    source?: AdminMailContact['source'];
    estimated: number;
  };
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
  };
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdBy: string;
  createdAt: string;
  templateId?: string;
}

export interface AdminMailStats {
  overview: {
    totalMessages: number;
    unreadCount: number;
    totalContacts: number;
    activeCampaigns: number;
    emailsSentToday: number;
    emailsSentThisWeek: number;
    averageResponseTime: string;
    responseRate: number;
  };
  byCategory: Record<AdminMailCategory, number>;
  byFolder: Record<AdminMailFolder, number>;
  snoozedCount?: number;
  snippetsCount?: number;
  draftsCount?: number;
  recentActivity: { id: string; type: 'received' | 'sent' | 'campaign' | 'contact_added'; description: string; timestamp: number }[];
}
