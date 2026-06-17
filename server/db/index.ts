import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/aether_energy";

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { client };
export { schema };

// ─── Lightweight, idempotent auto-migrations ────────────────────────────
// drizzle-kit migrations are not wired up yet, so we run safe ALTER statements
// at startup. Each statement is IF NOT EXISTS so they're safe to re-run.
let migrationsRan = false;
export async function runMigrations(): Promise<void> {
  if (migrationsRan) return;
  migrationsRan = true;
  try {
    // Users
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified text NOT NULL DEFAULT 'false'`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb`;
    await client`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username))`;

    // Audit log table
    await client`CREATE TABLE IF NOT EXISTS audit_log (
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
    )`;
    await client`CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (user_id, created_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action, created_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC)`;

    // Strategies hot-path indexes
    await client`CREATE INDEX IF NOT EXISTS strategies_user_status_idx ON strategies (user_id, status)`;
    await client`CREATE INDEX IF NOT EXISTS strategies_user_updated_idx ON strategies (user_id, updated_at DESC)`;

    // Trades hot-path indexes
    await client`CREATE INDEX IF NOT EXISTS trades_user_status_idx ON trades (user_id, status)`;
    await client`CREATE INDEX IF NOT EXISTS trades_user_opened_idx ON trades (user_id, opened_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS trades_strategy_idx ON trades (strategy_id)`;

    // Notifications hot-path
    await client`CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read, created_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC)`;

    // Signals hot-path
    await client`CREATE INDEX IF NOT EXISTS signals_user_ack_idx ON signals (user_id, acknowledged, created_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS signals_symbol_idx ON signals (symbol, created_at DESC)`;

    // Orders hot-path
    await client`CREATE INDEX IF NOT EXISTS orders_user_status_idx ON orders (user_id, status, created_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS orders_user_symbol_idx ON orders (user_id, symbol, created_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS orders_pending_idx ON orders (symbol, status) WHERE status = 'pending'`;

    // Positions
    await client`CREATE UNIQUE INDEX IF NOT EXISTS positions_user_symbol_uq ON positions (user_id, symbol)`;

    // Strategy runs
    await client`CREATE INDEX IF NOT EXISTS strategy_runs_user_idx ON strategy_runs (user_id, started_at DESC)`;
    await client`CREATE INDEX IF NOT EXISTS strategy_runs_strategy_idx ON strategy_runs (strategy_id, status)`;

    // Orders table (Phase 2)
    await client`CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      strategy_id text,
      symbol text NOT NULL,
      side text NOT NULL CHECK (side IN ('buy','sell')),
      type text NOT NULL CHECK (type IN ('market','limit','stop')),
      quantity numeric(20,8) NOT NULL,
      limit_price numeric(20,8),
      stop_price numeric(20,8),
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','filled','cancelled','rejected','partial')),
      filled_qty numeric(20,8) NOT NULL DEFAULT 0,
      avg_fill_price numeric(20,8),
      rejection_reason text,
      created_at timestamp NOT NULL DEFAULT now(),
      filled_at timestamp,
      cancelled_at timestamp
    )`;

    // Positions table (Phase 2)
    await client`CREATE TABLE IF NOT EXISTS positions (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol text NOT NULL,
      quantity numeric(20,8) NOT NULL,
      avg_entry_price numeric(20,8) NOT NULL,
      realized_pnl numeric(20,8) NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      UNIQUE(user_id, symbol)
    )`;

    // Strategy runs table (Phase 2)
    await client`CREATE TABLE IF NOT EXISTS strategy_runs (
      id text PRIMARY KEY,
      strategy_id text NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','stopped','error')),
      started_at timestamp NOT NULL DEFAULT now(),
      stopped_at timestamp,
      total_pnl numeric(20,8) NOT NULL DEFAULT 0,
      trade_count integer NOT NULL DEFAULT 0,
      last_error text
    )`;

    console.log("[db] Auto-migrations + indexes complete");
  } catch (err) {
    console.warn("[db] Auto-migrations skipped/failed (continuing):", (err as Error).message);
  }
}
