import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/aether_energy";
const readReplicaUrl = process.env.DATABASE_READ_REPLICA_URL;

// Primary client — for writes + critical reads
const client = postgres(connectionString, {
  prepare: false,
  max: 20,                    // pool size per process
  idle_timeout: 30,           // close idle conns after 30s
  connect_timeout: 10,
  // Health check
  onnotice: () => {},
});

// Read replica — falls back to primary if not configured
const readClient = readReplicaUrl
  ? postgres(readReplicaUrl, { prepare: false, max: 20, idle_timeout: 30, connect_timeout: 10 })
  : client;

export const db = drizzle(client, { schema });
export const readDb = drizzle(readClient, { schema });
export { client, readClient };
export { schema };

// ─── Lightweight, idempotent auto-migrations ────────────────────────────
// drizzle-kit migrations are not wired up yet, so we run safe statements
// at startup. Each is independently fault-tolerant so one failure doesn't
// prevent subsequent tables/indexes from being created.
let migrationsRan = false;

async function safe(sql: string, label: string) {
  try {
    await client.unsafe(sql);
  } catch (err) {
    console.warn(`[db] ${label} skipped: ${(err as Error).message}`);
  }
}

export async function runMigrations(): Promise<void> {
  if (migrationsRan) return;
  migrationsRan = true;

  // ─── Core tables (must be created first, in dependency order) ──────
  await safe(`CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    username text NOT NULL,
    password_hash text NOT NULL,
    wallet_address text,
    tier text NOT NULL DEFAULT 'free',
    status text NOT NULL DEFAULT 'active',
    email_verified text NOT NULL DEFAULT 'false',
    last_login_at timestamp,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`, "users table");

  // Users columns (safe to ALTER since table now exists)
  await safe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`, "users.status");
  await safe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified text NOT NULL DEFAULT 'false'`, "users.email_verified");
  await safe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp`, "users.last_login_at");
  await safe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb`, "users.preferences");
  await safe(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username))`, "users username idx");

  await safe(`CREATE TABLE IF NOT EXISTS strategies (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    config text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    sharpe_ratio numeric(10, 4),
    max_drawdown numeric(10, 4),
    win_rate numeric(10, 4),
    profit_factor numeric(10, 4),
    total_trades integer DEFAULT 0,
    total_return numeric(10, 4),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`, "strategies table");

  await safe(`CREATE TABLE IF NOT EXISTS trades (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy_id text REFERENCES strategies(id) ON DELETE SET NULL,
    asset text NOT NULL,
    side text NOT NULL,
    type text NOT NULL,
    quantity numeric(20,8) NOT NULL,
    entry_price numeric(20,8) NOT NULL,
    exit_price numeric(20,8),
    pnl numeric(20,8),
    status text NOT NULL DEFAULT 'open',
    opened_at timestamp NOT NULL DEFAULT now(),
    closed_at timestamp
  )`, "trades table");

  await safe(`CREATE TABLE IF NOT EXISTS sessions (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "sessions table");

  await safe(`CREATE TABLE IF NOT EXISTS market_cache (
    symbol text PRIMARY KEY,
    data text NOT NULL,
    updated_at timestamp NOT NULL DEFAULT now()
  )`, "market_cache table");

  await safe(`CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    meta text,
    read text NOT NULL DEFAULT 'false',
    created_at timestamp NOT NULL DEFAULT now()
  )`, "notifications table");

  await safe(`CREATE TABLE IF NOT EXISTS signals (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE SET NULL,
    symbol text NOT NULL,
    direction text NOT NULL,
    confidence numeric(5,4) NOT NULL,
    strategy text NOT NULL,
    reason text NOT NULL,
    acknowledged text NOT NULL DEFAULT 'false',
    expires_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "signals table");

  await safe(`CREATE TABLE IF NOT EXISTS benchmark_results (
    id text PRIMARY KEY,
    agent_id text NOT NULL,
    agent_name text NOT NULL,
    test_case text NOT NULL,
    category text NOT NULL,
    score integer NOT NULL,
    passed text NOT NULL,
    details text,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "benchmark_results table");

  // ─── Audit log ─────────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS audit_log (
    id text PRIMARY KEY,
    user_id text,
    actor_id text,
    action text NOT NULL,
    resource text,
    resource_id text,
    ip text,
    user_agent text,
    meta text,
    request_id text,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "audit_log table");

  // ─── Indexes on core tables ────────────────────────────────────────
  await safe(`CREATE INDEX IF NOT EXISTS strategies_user_status_idx ON strategies (user_id, status)`, "strategies user_status idx");
  await safe(`CREATE INDEX IF NOT EXISTS strategies_user_updated_idx ON strategies (user_id, updated_at DESC)`, "strategies user_updated idx");
  await safe(`CREATE INDEX IF NOT EXISTS trades_user_status_idx ON trades (user_id, status)`, "trades user_status idx");
  await safe(`CREATE INDEX IF NOT EXISTS trades_user_opened_idx ON trades (user_id, opened_at DESC)`, "trades user_opened idx");
  await safe(`CREATE INDEX IF NOT EXISTS trades_strategy_idx ON trades (strategy_id)`, "trades strategy idx");
  await safe(`CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read, created_at DESC)`, "notifications user_unread idx");
  await safe(`CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC)`, "notifications user_created idx");
  await safe(`CREATE INDEX IF NOT EXISTS signals_user_ack_idx ON signals (user_id, acknowledged, created_at DESC)`, "signals user_ack idx");
  await safe(`CREATE INDEX IF NOT EXISTS signals_symbol_idx ON signals (symbol, created_at DESC)`, "signals symbol idx");
  await safe(`CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (user_id, created_at DESC)`, "audit_log user idx");
  await safe(`CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action, created_at DESC)`, "audit_log action idx");
  await safe(`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC)`, "audit_log created idx");

  // ─── Orders table ──────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy_id text,
    symbol text NOT NULL,
    side text NOT NULL,
    type text NOT NULL,
    quantity numeric(20,8) NOT NULL,
    limit_price numeric(20,8),
    stop_price numeric(20,8),
    status text NOT NULL DEFAULT 'pending',
    filled_qty numeric(20,8) NOT NULL DEFAULT 0,
    avg_fill_price numeric(20,8),
    rejection_reason text,
    created_at timestamp NOT NULL DEFAULT now(),
    filled_at timestamp,
    cancelled_at timestamp
  )`, "orders table");
  await safe(`CREATE INDEX IF NOT EXISTS orders_user_status_idx ON orders (user_id, status, created_at DESC)`, "orders user_status idx");
  await safe(`CREATE INDEX IF NOT EXISTS orders_user_symbol_idx ON orders (user_id, symbol, created_at DESC)`, "orders user_symbol idx");
  await safe(`CREATE INDEX IF NOT EXISTS orders_pending_idx ON orders (symbol, status) WHERE status = 'pending'`, "orders pending idx");

  // ─── Positions ─────────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS positions (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol text NOT NULL,
    quantity numeric(20,8) NOT NULL,
    avg_entry_price numeric(20,8) NOT NULL,
    realized_pnl numeric(20,8) NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE(user_id, symbol)
  )`, "positions table");
  await safe(`CREATE UNIQUE INDEX IF NOT EXISTS positions_user_symbol_uq ON positions (user_id, symbol)`, "positions user_symbol uq");

  // ─── Strategy runs ─────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS strategy_runs (
    id text PRIMARY KEY,
    strategy_id text NOT NULL,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'running',
    started_at timestamp NOT NULL DEFAULT now(),
    stopped_at timestamp,
    total_pnl numeric(20,8) NOT NULL DEFAULT 0,
    trade_count integer NOT NULL DEFAULT 0,
    last_error text
  )`, "strategy_runs table");
  await safe(`CREATE INDEX IF NOT EXISTS strategy_runs_user_idx ON strategy_runs (user_id, started_at DESC)`, "strategy_runs user idx");
  await safe(`CREATE INDEX IF NOT EXISTS strategy_runs_strategy_idx ON strategy_runs (strategy_id, status)`, "strategy_runs strategy idx");

  // ─── KYC submissions ───────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS kyc_submissions (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    legal_name text,
    date_of_birth text,
    country text,
    address text,
    id_document_type text,
    id_document_number text,
    id_document_country text,
    tax_id_last4 text,
    alpaca_account_id text,
    risk_acknowledged text DEFAULT 'false',
    review_notes text,
    reviewed_by text,
    submitted_at timestamp NOT NULL DEFAULT now(),
    reviewed_at timestamp
  )`, "kyc_submissions table");
  await safe(`CREATE INDEX IF NOT EXISTS kyc_user_idx ON kyc_submissions (user_id, submitted_at DESC)`, "kyc user idx");
  await safe(`CREATE INDEX IF NOT EXISTS kyc_status_idx ON kyc_submissions (status, submitted_at DESC)`, "kyc status idx");

  // ─── Consent log ───────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS consent_log (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type text NOT NULL,
    document_version text NOT NULL,
    ip_address text,
    user_agent text,
    accepted_at timestamp NOT NULL DEFAULT now()
  )`, "consent_log table");
  await safe(`CREATE INDEX IF NOT EXISTS consent_user_idx ON consent_log (user_id, accepted_at DESC)`, "consent user idx");

  // ─── Tournaments ───────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS tournaments (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    starting_balance numeric(20,2) NOT NULL DEFAULT 100000,
    starts_at timestamp NOT NULL,
    ends_at timestamp NOT NULL,
    status text NOT NULL DEFAULT 'upcoming',
    max_participants integer NOT NULL DEFAULT 100,
    prize_pool text,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "tournaments table");
  await safe(`CREATE INDEX IF NOT EXISTS tournaments_status_idx ON tournaments (status, starts_at DESC)`, "tournaments status idx");

  // ─── Tournament entries ────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS tournament_entries (
    id text PRIMARY KEY,
    tournament_id text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starting_balance numeric(20,2) NOT NULL,
    current_equity numeric(20,2) NOT NULL,
    total_pnl numeric(20,2) NOT NULL DEFAULT 0,
    total_pnl_pct numeric(20,8) NOT NULL DEFAULT 0,
    trades integer NOT NULL DEFAULT 0,
    rank integer,
    joined_at timestamp NOT NULL DEFAULT now(),
    last_updated timestamp NOT NULL DEFAULT now()
  )`, "tournament_entries table");
  await safe(`CREATE UNIQUE INDEX IF NOT EXISTS tournament_user_uq ON tournament_entries (tournament_id, user_id)`, "tournament user uq");
  await safe(`CREATE INDEX IF NOT EXISTS tournament_leaderboard_idx ON tournament_entries (tournament_id, total_pnl_pct DESC)`, "tournament leaderboard idx");

  // ─── Backtests ─────────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS backtests (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy text NOT NULL,
    symbol text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    initial_balance numeric(20,2) NOT NULL,
    final_equity numeric(20,2),
    total_return numeric(20,8),
    total_return_pct numeric(20,8),
    sharpe_ratio numeric(20,8),
    max_drawdown numeric(20,8),
    max_drawdown_pct numeric(20,8),
    win_rate numeric(20,8),
    total_trades integer,
    status text NOT NULL DEFAULT 'running',
    params text,
    result text,
    error text,
    created_at timestamp NOT NULL DEFAULT now(),
    completed_at timestamp
  )`, "backtests table");
  await safe(`CREATE INDEX IF NOT EXISTS backtests_user_idx ON backtests (user_id, created_at DESC)`, "backtests user idx");

  // ─── Custom strategies ─────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS custom_strategies (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    symbol text NOT NULL,
    conditions text NOT NULL,
    actions text NOT NULL,
    enabled text NOT NULL DEFAULT 'true',
    published text NOT NULL DEFAULT 'false',
    clones integer NOT NULL DEFAULT 0,
    rating integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`, "custom_strategies table");
  await safe(`CREATE INDEX IF NOT EXISTS custom_strategies_user_idx ON custom_strategies (user_id, created_at DESC)`, "custom_strategies user idx");

  // ─── Trade journal ─────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS trade_journal (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id text,
    symbol text NOT NULL,
    side text NOT NULL,
    thesis text,
    lessons text,
    tags text[],
    rating integer,
    pnl_at_note numeric(18, 8),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`, "trade_journal table");
  await safe(`CREATE INDEX IF NOT EXISTS trade_journal_user_idx ON trade_journal (user_id, created_at DESC)`, "trade_journal user idx");
  await safe(`CREATE INDEX IF NOT EXISTS trade_journal_symbol_idx ON trade_journal (user_id, symbol)`, "trade_journal symbol idx");

  // ─── Price alerts ──────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS price_alerts (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol text NOT NULL,
    condition text NOT NULL,
    threshold numeric(18, 8) NOT NULL,
    current_price numeric(18, 8),
    triggered_at timestamp,
    active integer NOT NULL DEFAULT 1,
    trigger_once integer NOT NULL DEFAULT 1,
    notify_email integer NOT NULL DEFAULT 0,
    notify_discord integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "price_alerts table");
  await safe(`CREATE INDEX IF NOT EXISTS price_alerts_active_idx ON price_alerts (active, symbol) WHERE active = 1`, "price_alerts active idx");
  await safe(`CREATE INDEX IF NOT EXISTS price_alerts_user_idx ON price_alerts (user_id, created_at DESC)`, "price_alerts user idx");

  // ─── API keys ──────────────────────────────────────────────────────
  await safe(`CREATE TABLE IF NOT EXISTS api_keys (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    prefix text NOT NULL,
    hash text NOT NULL,
    scopes text[] NOT NULL DEFAULT '{}',
    last_used_at timestamp,
    expires_at timestamp,
    revoked_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  )`, "api_keys table");
  await safe(`CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys (prefix) WHERE revoked_at IS NULL`, "api_keys prefix idx");
  await safe(`CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys (user_id, created_at DESC)`, "api_keys user idx");

  console.log("[db] Auto-migrations + indexes complete");
}
