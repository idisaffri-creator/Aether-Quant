import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/aether_energy";

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };

// ─── Lightweight, idempotent auto-migrations ────────────────────────────
// drizzle-kit migrations are not wired up yet, so we run safe ALTER statements
// at startup. Each statement is IF NOT EXISTS so they're safe to re-run.
let migrationsRan = false;
export async function runMigrations(): Promise<void> {
  if (migrationsRan) return;
  migrationsRan = true;
  try {
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified text NOT NULL DEFAULT 'false'`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb`;
    await client`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username))`;
    console.log("[db] Auto-migrations complete");
  } catch (err) {
    console.warn("[db] Auto-migrations skipped/failed (continuing):", (err as Error).message);
  }
}
