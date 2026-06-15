import { pgTable, text, timestamp, integer, decimal, foreignKey, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  walletAddress: text("wallet_address"),
  tier: text("tier", { enum: ["free", "professional", "enterprise"] }).default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
