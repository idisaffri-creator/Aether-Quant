/**
 * Alpaca Markets broker adapter.
 * Used for REAL money trading (paper-trading is handled by paperEngine).
 *
 * Set env vars:
 *   ALPACA_API_KEY     - API key from https://app.alpaca.markets
 *   ALPACA_SECRET_KEY  - Secret key
 *   ALPACA_BASE_URL    - https://api.alpaca.markets (live) or https://paper-api.alpaca.markets (paper)
 *
 * For live trading, user MUST:
 *   1. Have KYC verified
 *   2. Have linked Alpaca account
 *   3. Opt-in to live mode
 *
 * API docs: https://alpaca.markets/docs/api-references/trading-api/
 */
import { logger } from "../../lib/logger";

const DEFAULT_PAPER_URL = "https://paper-api.alpaca.markets";
const DEFAULT_LIVE_URL = "https://api.alpaca.markets";
const TIMEOUT_MS = 10_000;

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: string;
  type: "market" | "limit" | "stop";
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  filled_qty: string;
  filled_avg_price: string | null;
  created_at: string;
  filled_at: string | null;
  cancelled_at: string | null;
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  equity: string;
  last_equity: string;
  multiplier: string;
  initial_margin: string;
  maintenance_margin: string;
  sma: string;
  daytrade_count: number;
  last_maintenance_margin: string;
  daytrading_buying_power: string;
  regt_buying_power: string;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  shorting_enabled: boolean;
  long_market_value: string;
  short_market_value: string;
  initial_equity: string;
  last_daytrade: string;
  realized_pnl: string;
  unrealized_pnl: string;
  equity_today: string;
}

export interface AlpacaConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

export function getAlpacaConfig(): AlpacaConfig | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  const baseUrl = process.env.ALPACA_BASE_URL || DEFAULT_PAPER_URL;
  return { apiKey, secretKey, baseUrl };
}

async function alpacaFetch<T>(config: AlpacaConfig, path: string, options: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64");
    const r = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: {
        "APCA-API-KEY-ID": config.apiKey,
        "APCA-API-SECRET-KEY": config.secretKey,
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...((options.headers as Record<string, string>) || {}),
      },
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      throw new Error(`Alpaca ${r.status}: ${errText.slice(0, 200)}`);
    }
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Get account info (cash, buying power, etc.)
 */
export async function getAlpacaAccount(): Promise<AlpacaAccount | null> {
  const config = getAlpacaConfig();
  if (!config) return null;
  try {
    return await alpacaFetch<AlpacaAccount>(config, "/v2/account");
  } catch (err) {
    logger.error({ err: (err as Error).message }, "alpaca account fetch failed");
    return null;
  }
}

/**
 * Submit a real order via Alpaca.
 * Returns the Alpaca order object on success, or throws.
 */
export async function submitAlpacaOrder(input: {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  type: "market" | "limit" | "stop";
  limitPrice?: number;
  stopPrice?: number;
  clientOrderId: string;
}): Promise<AlpacaOrder> {
  const config = getAlpacaConfig();
  if (!config) throw new Error("Alpaca not configured (ALPACA_API_KEY / ALPACA_SECRET_KEY missing)");

  const body: any = {
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    qty: input.qty,
    type: input.type,
    time_in_force: "gtc",
    client_order_id: input.clientOrderId,
  };
  if (input.type === "limit" && input.limitPrice) body.limit_price = input.limitPrice;
  if (input.type === "stop" && input.stopPrice) body.stop_price = input.stopPrice;

  return alpacaFetch<AlpacaOrder>(config, "/v2/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Cancel an open Alpaca order.
 */
export async function cancelAlpacaOrder(orderId: string): Promise<void> {
  const config = getAlpacaConfig();
  if (!config) throw new Error("Alpaca not configured");
  await alpacaFetch(config, `/v2/orders/${orderId}`, { method: "DELETE" });
}

/**
 * Get current Alpaca positions.
 */
export async function getAlpacaPositions(): Promise<Array<{ symbol: string; qty: string; avg_entry_price: string; market_value: string; unrealized_pl: string }>> {
  const config = getAlpacaConfig();
  if (!config) return [];
  try {
    return await alpacaFetch<any[]>(config, "/v2/positions");
  } catch {
    return [];
  }
}

export function isAlpacaConfigured(): boolean {
  return !!process.env.ALPACA_API_KEY && !!process.env.ALPACA_SECRET_KEY;
}
