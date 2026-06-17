import { pgTable, text, timestamp, integer, decimal, foreignKey, index, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  walletAddress: text("wallet_address"),
  tier: text("tier", { enum: ["free", "professional", "enterprise", "admin"] }).default("free").notNull(),
  status: text("status", { enum: ["active", "suspended", "pending"] }).default("active").notNull(),
  emailVerified: text("email_verified").default("false").notNull(),
  lastLoginAt: timestamp("last_login_at"),
  preferences: jsonb("preferences").$type<UserPreferences>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const strategies = pgTable("strategies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  config: text("config").notNull(),
  status: text("status", { enum: ["draft", "active", "paused", "archived"] }).default("draft").notNull(),
  sharpeRatio: decimal("sharpe_ratio", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 4 }),
  winRate: decimal("win_rate", { precision: 10, scale: 4 }),
  profitFactor: decimal("profit_factor", { precision: 10, scale: 4 }),
  totalTrades: integer("total_trades").default(0),
  totalReturn: decimal("total_return", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  strategyId: text("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
  asset: text("asset").notNull(),
  side: text("side", { enum: ["long", "short"] }).notNull(),
  type: text("type", { enum: ["market", "limit", "stop"] }).notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }).notNull(),
  exitPrice: decimal("exit_price", { precision: 20, scale: 8 }),
  pnl: decimal("pnl", { precision: 20, scale: 8 }),
  status: text("status", { enum: ["open", "closed", "cancelled"] }).default("open").notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketCache = pgTable("market_cache", {
  symbol: text("symbol").primaryKey(),
  data: text("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["trade", "signal", "alert", "system", "position"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: text("read").default("false").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  symbol: text("symbol").notNull(),
  direction: text("direction", { enum: ["long", "short"] }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  strategy: text("strategy").notNull(),
  reason: text("reason").notNull(),
  acknowledged: text("acknowledged").default("false").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const benchmarkResults = pgTable("benchmark_results", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  testCase: text("test_case").notNull(),
  category: text("category", { enum: ["decision", "timing", "risk", "signal"] }).notNull(),
  score: integer("score").notNull(),
  passed: text("passed").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  resource: text("resource"),
  resourceId: text("resource_id"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  meta: text("meta"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  strategyId: text("strategy_id"),
  symbol: text("symbol").notNull(),
  side: text("side", { enum: ["buy", "sell"] }).notNull(),
  type: text("type", { enum: ["market", "limit", "stop"] }).notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  limitPrice: decimal("limit_price", { precision: 20, scale: 8 }),
  stopPrice: decimal("stop_price", { precision: 20, scale: 8 }),
  status: text("status", { enum: ["pending", "filled", "cancelled", "rejected", "partial"] }).notNull(),
  filledQty: decimal("filled_qty", { precision: 20, scale: 8 }).default("0").notNull(),
  avgFillPrice: decimal("avg_fill_price", { precision: 20, scale: 8 }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  filledAt: timestamp("filled_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export const positions = pgTable("positions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(), // signed: + long, - short
  avgEntryPrice: decimal("avg_entry_price", { precision: 20, scale: 8 }).notNull(),
  realizedPnl: decimal("realized_pnl", { precision: 20, scale: 8 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const strategyRuns = pgTable("strategy_runs", {
  id: text("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["running", "stopped", "error"] }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  stoppedAt: timestamp("stopped_at"),
  totalPnl: decimal("total_pnl", { precision: 20, scale: 8 }).default("0").notNull(),
  tradeCount: integer("trade_count").default(0).notNull(),
  lastError: text("last_error"),
});

export const kycSubmissions = pgTable("kyc_submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "approved", "rejected", "needs_info"] }).notNull().default("pending"),
  legalName: text("legal_name"),
  dateOfBirth: text("date_of_birth"),
  country: text("country"),
  address: text("address"),
  idDocumentType: text("id_document_type"),
  idDocumentNumber: text("id_document_number"),
  idDocumentCountry: text("id_document_country"),
  taxIdLast4: text("tax_id_last4"),
  alpacaAccountId: text("alpaca_account_id"),
  riskAcknowledged: text("risk_acknowledged").default("false"),
  reviewNotes: text("review_notes"),
  reviewedBy: text("reviewed_by"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const consentLog = pgTable("consent_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  documentVersion: text("document_version").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
});

export const backtests = pgTable("backtests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  strategy: text("strategy").notNull(),
  symbol: text("symbol").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  initialBalance: decimal("initial_balance", { precision: 20, scale: 2 }).notNull(),
  finalEquity: decimal("final_equity", { precision: 20, scale: 2 }),
  totalReturn: decimal("total_return", { precision: 20, scale: 8 }),
  totalReturnPct: decimal("total_return_pct", { precision: 20, scale: 8 }),
  sharpeRatio: decimal("sharpe_ratio", { precision: 20, scale: 8 }),
  maxDrawdown: decimal("max_drawdown", { precision: 20, scale: 8 }),
  maxDrawdownPct: decimal("max_drawdown_pct", { precision: 20, scale: 8 }),
  winRate: decimal("win_rate", { precision: 20, scale: 8 }),
  totalTrades: integer("total_trades"),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull().default("running"),
  params: text("params"),
  result: text("result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const customStrategies = pgTable("custom_strategies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  symbol: text("symbol").notNull(),
  conditions: text("conditions").notNull(),
  actions: text("actions").notNull(),
  enabled: text("enabled", { enum: ["true", "false"] }).notNull().default("true"),
  published: text("published", { enum: ["true", "false"] }).notNull().default("false"),
  clones: integer("clones").notNull().default(0),
  rating: integer("rating").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
