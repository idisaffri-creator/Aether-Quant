/**
 * OpenAPI 3.1 spec for the Aether Energy public API.
 * Hand-curated for the most important endpoints.
 * Served at GET /api/openapi.json
 * Swagger UI at GET /api/docs
 */
import { Router } from "express";

const router = Router();

// ─── Reusable parameter + response shapes ─────────────────────────────
const bearerSecurity = [{ bearerAuth: [] }];
const pathParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
  description,
});
const ok = (description: string, schema?: any) => ({
  description,
  content: schema
    ? { "application/json": { schema: { type: "object", properties: { data: schema } } } }
    : undefined,
});
const err = (status: number, description: string) => ({
  [String(status)]: { description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
});

// ─── Path definitions ──────────────────────────────────────────────────
const paths: Record<string, any> = {
  "/live": {
    get: { summary: "Liveness probe", tags: ["Health"], security: [], responses: { "200": { description: "alive" } } },
  },
  "/ready": {
    get: {
      summary: "Readiness probe (DB + Redis)",
      tags: ["Health"],
      security: [],
      responses: {
        "200": { description: "ready — DB and Redis reachable" },
        "503": { description: "degraded — see body for which check failed" },
      },
    },
  },
  "/metrics": {
    get: { summary: "Prometheus exposition (11+ custom series)", tags: ["Health"], security: [], responses: { "200": { description: "text/plain" } } },
  },
  "/status": {
    get: { summary: "Public status (text — uptime monitors)", tags: ["Health"], security: [], responses: { "200": { description: "OK" }, "503": { description: "DEGRADED" } } },
  },
  "/status/json": {
    get: { summary: "Public status (JSON)", tags: ["Health"], security: [], responses: { "200": { description: "full status" } } },
  },

  "/api/auth/login": {
    post: {
      summary: "Login (email + password)",
      tags: ["Auth"],
      security: [],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } } },
      responses: { "200": { description: "JWT + user" }, "401": { description: "Invalid credentials" } },
    },
  },
  "/api/auth/me": { get: { summary: "Get current user", tags: ["Auth"], responses: { "200": { description: "user" } } } },
  "/api/auth/profile": { put: { summary: "Update profile (email, username, wallet)", tags: ["Auth"], responses: { "200": { description: "updated user" } } } },
  "/api/auth/change-password": { post: { summary: "Change password (requires current password)", tags: ["Auth"], responses: { "200": { description: "changed" } } } },
  "/api/auth/preferences": {
    get: { summary: "Get notification/appearance/privacy preferences", tags: ["Auth"], responses: { "200": { description: "preferences" } } },
    put: { summary: "Update preferences (deep-merge)", tags: ["Auth"], responses: { "200": { description: "preferences" } } },
  },
  "/api/auth/me/export": { get: { summary: "GDPR Art. 20 — export all your data as JSON", tags: ["Auth"], responses: { "200": { description: "JSON dump" } } } },
  "/api/auth/me": { delete: { summary: "GDPR Art. 17 — anonymize account, preserve aggregates", tags: ["Auth"], responses: { "200": { description: "anonymized" } } } },
  "/api/auth/2fa/setup": { post: { summary: "Begin TOTP enrollment (returns QR + secret)", tags: ["Auth"], responses: { "200": { description: "qrDataUrl + secret" } } } },
  "/api/auth/2fa/verify": { post: { summary: "Confirm TOTP and enable 2FA (returns backup codes)", tags: ["Auth"], responses: { "200": { description: "backupCodes" } } } },
  "/api/auth/2fa/disable": { post: { summary: "Disable 2FA (requires password)", tags: ["Auth"], responses: { "200": { description: "disabled" } } } },

  "/api/market/quotes": {
    get: { summary: "List live quotes for 8 energy symbols", tags: ["Market"], responses: { "200": { description: "quotes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MarketData" } } } } } } },
  },
  "/api/market/quotes/{symbol}": {
    get: { summary: "Single symbol quote", tags: ["Market"], parameters: [pathParam("symbol", "Symbol like WTI, BRENT, NGAS, GOLD")], responses: { "200": { description: "quote" }, "404": { description: "unknown symbol" } } },
  },
  "/api/market/history/{symbol}": {
    get: {
      summary: "OHLCV candles (1m / 5m / 15m / 1h / 1d)",
      tags: ["Market"],
      parameters: [
        pathParam("symbol", "Symbol like WTI"),
        { name: "resolution", in: "query", schema: { enum: ["1m", "5m", "15m", "1h", "1d"] } },
        { name: "count", in: "query", schema: { type: "integer", default: 100, maximum: 200 } },
      ],
      responses: { "200": { description: "candles" } },
    },
  },
  "/api/market/orderbook/{symbol}": {
    get: { summary: "Order book — requires paid L2 feed (not yet implemented)", tags: ["Market"], responses: { "501": { description: "Not implemented" } } },
  },

  "/api/data/status": {
    get: { summary: "Health of all data feeds + ingest run timestamps", tags: ["Data"], security: [], responses: { "200": { description: "feed status with upgrade hints" } } },
  },
  "/api/news": {
    get: {
      summary: "List energy + financial news with sentiment",
      tags: ["News"],
      parameters: [
        { name: "ticker", in: "query", schema: { enum: ["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"] } },
        { name: "sentiment", in: "query", schema: { enum: ["bullish", "bearish", "neutral"] } },
        { name: "source", in: "query", schema: { enum: ["newsapi", "gdelt", "mock"] } },
        { name: "limit", in: "query", schema: { type: "integer", maximum: 50 } },
      ],
      responses: { "200": { description: "articles + source" } },
    },
  },

  "/api/trading/orders": {
    get: {
      summary: "List your paper orders",
      tags: ["Trading"],
      parameters: [
        { name: "status", in: "query", schema: { enum: ["pending", "filled", "cancelled", "rejected", "partial"] } },
        { name: "symbol", in: "query" },
        { name: "limit", in: "query", schema: { type: "integer", maximum: 200 } },
        { name: "offset", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "orders" } },
    },
    post: {
      summary: "Submit a paper order (market / limit / stop)",
      tags: ["Trading"],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { symbol: { enum: ["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"] }, side: { enum: ["buy", "sell"] }, type: { enum: ["market", "limit", "stop"] }, quantity: { type: "number", minimum: 0.1 }, limitPrice: { type: "number" }, stopPrice: { type: "number" }, strategyId: { type: "string" } }, required: ["symbol", "side", "type", "quantity"] } } } },
      responses: { "201": { description: "filled or pending" }, "400": { description: "rejected (validation or risk)" } },
    },
  },
  "/api/trading/orders/{id}": {
    delete: { summary: "Cancel a pending order", tags: ["Trading"], parameters: [pathParam("id", "Order ID")], responses: { "200": { description: "cancelled" }, "400": { description: "cannot cancel non-pending order" } } },
  },
  "/api/trading/positions": {
    get: {
      summary: "List your open positions",
      tags: ["Trading"],
      responses: {
        "200": {
          description: "positions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  positions: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Position" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "/api/trading/pnl": {
    get: {
      summary: "P&L summary (paper balance, equity, unrealized, realized)",
      tags: ["Trading"],
      responses: {
        "200": {
          description: "summary",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/PnlSummary" } }
          }
        }
      }
    }
  },
  "/api/trading/strategies/{id}/start": { post: { summary: "Start auto-trading a strategy", tags: ["Trading"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "running" } } } },
  "/api/trading/strategies/{id}/stop": { post: { summary: "Stop auto-trading a strategy", tags: ["Trading"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "stopped" }, "404": { description: "no running instance" } } } },
  "/api/trading/strategies/runs": { get: { summary: "List your strategy runs (P&L, trade count)", tags: ["Trading"], responses: { "200": { description: "runs" } } } },
  "/api/trading/mode": { post: { summary: "Switch paper/live trading mode (live requires KYC + Alpaca)", tags: ["Trading"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { mode: { type: "string", enum: ["paper", "live"] } }, required: ["mode"] } } } }, responses: { "200": { description: "switched" }, "400": { description: "live requires KYC + Alpaca" } } } },

  "/api/backtest/run": { post: { summary: "Run a backtest (Mean Reversion, Momentum, Buy & Hold)", tags: ["Backtest"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { strategy: { type: "string", enum: ["Mean Reversion", "Momentum", "Buy & Hold"] }, symbol: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" }, initialBalance: { type: "number" }, params: { type: "object" } }, required: ["strategy", "symbol", "startDate", "endDate", "initialBalance"] } } } }, responses: { "201": { description: "backtest result" } } } },
  "/api/backtest/{id}": { get: { summary: "Get a backtest result by id", tags: ["Backtest"], parameters: [pathParam("id", "Backtest ID")], responses: { "200": { description: "result" }, "404": { description: "not found" } } } },
  "/api/backtest": { get: { summary: "List your recent backtests", tags: ["Backtest"], responses: { "200": { description: "list" } } } },

  "/api/strategies/custom": { get: { summary: "List your custom strategies", tags: ["Strategies"], responses: { "200": { description: "list" } } }, post: { summary: "Create a custom strategy", tags: ["Strategies"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, symbol: { type: "string" }, conditions: { type: "array" }, actions: { type: "array" }, enabled: { type: "boolean" } }, required: ["name", "symbol", "conditions", "actions"] } } } }, responses: { "201": { description: "created" } } } },
  "/api/strategies/custom/{id}": { put: { summary: "Update a custom strategy", tags: ["Strategies"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "updated" }, "404": { description: "not found" } } }, delete: { summary: "Delete a custom strategy", tags: ["Strategies"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "deleted" } } } },
  "/api/strategies/templates": { get: { summary: "List pre-built strategy templates (RSI, MACD, MA cross, etc.)", tags: ["Strategies"], responses: { "200": { description: "templates" } } } },
  "/api/strategies/templates/{id}": { get: { summary: "Get a strategy template by id", tags: ["Strategies"], parameters: [pathParam("id", "Template ID")], responses: { "200": { description: "template" }, "404": { description: "not found" } } } },
  "/api/strategies/templates/{id}/clone": { post: { summary: "Clone a template into your custom strategies", tags: ["Strategies"], parameters: [pathParam("id", "Template ID")], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, symbol: { type: "string" } } } } } }, responses: { "201": { description: "cloned" } } } },

  "/api/kyc/inquiry": { post: { summary: "Create a KYC inquiry (redirects to provider UI)", tags: ["KYC"], responses: { "201": { description: "inquiry created" }, "503": { description: "provider not configured" } } } },
  "/api/kyc/webhook": { post: { summary: "Provider webhook (status updates)", tags: ["KYC"], responses: { "200": { description: "processed" } } } },

  "/api/risk/limits": { get: { summary: "Get your risk limits (max position, daily loss, max orders, kill switch)", tags: ["Risk"], responses: { "200": { description: "limits" } } }, put: { summary: "Update your risk limits", tags: ["Risk"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { maxPositionSize: { type: "number" }, maxDailyLoss: { type: "number" }, maxOpenOrders: { type: "integer" }, killSwitch: { type: "boolean" } } } } } }, responses: { "200": { description: "updated" } } } },
  "/api/risk/kill-switch": { post: { summary: "Toggle kill switch (enable/disable all new orders)", tags: ["Risk"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { action: { type: "string", enum: ["enable", "disable"] } }, required: ["action"] } } } }, responses: { "200": { description: "toggled" } } } },

  "/api/portfolio/analytics": { get: { summary: "Portfolio analytics: Sharpe, Sortino, max DD, win rate, exposure, per-symbol P&L", tags: ["Portfolio"], responses: { "200": { description: "metrics" } } } },

  "/api/calendar/upcoming": { get: { summary: "Upcoming economic events (EIA inventory, OPEC, Fed, rig count)", tags: ["Market"], responses: { "200": { description: "events" } } } },
  "/api/calendar": { get: { summary: "Full economic calendar (next 30 events)", tags: ["Market"], responses: { "200": { description: "events" } } } },

  "/api/legal/versions": { get: { summary: "Get current versions of ToS, Privacy, Risk Disclosure", tags: ["Legal"], responses: { "200": { description: "versions" } } } },
  "/api/legal/terms/text": { get: { summary: "Terms of Service (markdown)", tags: ["Legal"], responses: { "200": { description: "markdown" } } } },
  "/api/legal/privacy/text": { get: { summary: "Privacy Policy (markdown)", tags: ["Legal"], responses: { "200": { description: "markdown" } } } },
  "/api/legal/risk-disclosure/text": { get: { summary: "Risk Disclosure (markdown)", tags: ["Legal"], responses: { "200": { description: "markdown" } } } },
  "/api/legal/accept": { post: { summary: "Record acceptance of legal documents", tags: ["Legal"], responses: { "200": { description: "accepted" } } } },
  "/api/legal/acceptances": { get: { summary: "List your acceptance history", tags: ["Legal"], responses: { "200": { description: "list" } } } },

  "/api/ai/chat": { post: { summary: "Chat with Aether AI (OpenAI/Ollama/mock)", tags: ["AI"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { messages: { type: "array" } } } } } }, responses: { "200": { description: "ai response" } } } },
  "/api/ai/strategy": { post: { summary: "Get strategy recommendation for symbol", tags: ["AI"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { symbol: { type: "string" }, horizonDays: { type: "integer" }, riskTolerance: { type: "string", enum: ["low", "medium", "high"] } } } } } }, responses: { "200": { description: "recommendation" } } } },
  "/api/ai/status": { get: { summary: "Get AI provider status", tags: ["AI"], responses: { "200": { description: "provider" } } } },

  "/api/comparison/compare": { post: { summary: "Compare 2-10 backtests side-by-side", tags: ["Comparison"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { ids: { type: "array" } } } } } }, responses: { "200": { description: "comparison with rankings + best" } } } },

  "/api/search/strategies": { get: { summary: "Search custom strategies (Meilisearch)", tags: ["Search"], responses: { "200": { description: "hits" } } } },
  "/api/search/news": { get: { summary: "Search news (Meilisearch)", tags: ["Search"], responses: { "200": { description: "hits" } } } },
  "/api/search/signals": { get: { summary: "Search signals (Meilisearch)", tags: ["Search"], responses: { "200": { description: "hits" } } } },
  "/api/search/status": { get: { summary: "Search engine status", tags: ["Search"], responses: { "200": { description: "status" } } } },

  "/api/strategies/marketplace": { get: { summary: "List published strategies (search + filter)", tags: ["Marketplace"], responses: { "200": { description: "strategies" } } } },
  "/api/strategies/marketplace/{id}": { get: { summary: "Get a published strategy", tags: ["Marketplace"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "strategy" }, "404": { description: "not found" } } } },
  "/api/strategies/custom/{id}/publish": { post: { summary: "Publish custom strategy to marketplace", tags: ["Marketplace"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "published" } } } },
  "/api/strategies/custom/{id}/unpublish": { post: { summary: "Unpublish custom strategy", tags: ["Marketplace"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "unpublished" } } } },
  "/api/strategies/custom/{id}/clone": { post: { summary: "Clone a published strategy", tags: ["Marketplace"], parameters: [pathParam("id", "Source Strategy ID")], responses: { "201": { description: "cloned" } } } },
  "/api/strategies/custom/{id}/rate": { post: { summary: "Rate a strategy (1-5)", tags: ["Marketplace"], parameters: [pathParam("id", "Strategy ID")], responses: { "200": { description: "rated" } } } },

  "/api/leaderboard": { get: { summary: "Top 50 traders by realized P&L", tags: ["Leaderboard"], responses: { "200": { description: "leaderboard" } } } },
  "/api/leaderboard/me": { get: { summary: "My leaderboard rank + stats", tags: ["Leaderboard"], responses: { "200": { description: "my stats" } } } },

  "/api/storage/kyc/upload": { post: { summary: "Upload KYC document (multipart/form-data)", tags: ["Storage"], responses: { "200": { description: "key + location" } } } },
  "/api/storage/kyc/list": { get: { summary: "List your KYC documents", tags: ["Storage"], responses: { "200": { description: "objects" } } } },
  "/api/storage/kyc/download-url": { get: { summary: "Get signed download URL for KYC document", tags: ["Storage"], responses: { "200": { description: "url (1h expiry)" } } } },
  "/api/storage/kyc": { delete: { summary: "Delete a KYC document", tags: ["Storage"], responses: { "200": { description: "ok" } } } },
  "/api/storage/exports/upload": { post: { summary: "Upload an export (CSV/PDF)", tags: ["Storage"], responses: { "200": { description: "key + location" } } } },
  "/api/storage/status": { get: { summary: "Object storage status (configured, buckets)", tags: ["Storage"], responses: { "200": { description: "status" } } } },

  "/api/admin/users": { get: { summary: "List all users (admin only)", tags: ["Admin"], responses: { "200": { description: "users" } } } },
  "/api/admin/users/stats": { get: { summary: "User counts by tier (admin only)", tags: ["Admin"], responses: { "200": { description: "counts" } } } },
  "/api/admin/mail/folders": { get: { summary: "List admin mail folders with counts", tags: ["Admin"], responses: { "200": { description: "folders" } } } },
  "/api/admin/mail/messages": { get: { summary: "List admin mail messages", tags: ["Admin"], responses: { "200": { description: "messages" } } } },
  "/api/audit": { get: { summary: "List audit events (self for users, all for admin)", tags: ["Admin"], responses: { "200": { description: "entries" } } } },
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Aether Energy API",
    version: "1.0.0",
    description: "Real-time energy market data + paper trading + admin webmail. All `/api` routes require Bearer JWT unless noted.",
    contact: { name: "Aether Energy", url: "https://aether-energy.ai" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "https://aether-energy.ai", description: "Production" },
    { url: "http://localhost:3000", description: "Local dev" },
  ],
  tags: [
    { name: "Auth", description: "Login, register, profile, 2FA, preferences" },
    { name: "Market", description: "Live quotes and OHLCV candles" },
    { name: "Data", description: "Data feed health" },
    { name: "News", description: "Energy + financial news" },
    { name: "Trading", description: "Paper orders, positions, P&L, strategies" },
    { name: "Admin", description: "Users + admin webmail + audit" },
    { name: "Health", description: "Probes + metrics + status" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          status: { type: "integer" },
        },
        required: ["code", "message", "status"],
      },
      MarketData: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          price: { type: "number" },
          change24h: { type: "number" },
          volume24h: { type: "number" },
          high24h: { type: "number" },
          low24h: { type: "number" },
          bid: { type: "number" },
          ask: { type: "number" },
          spread: { type: "number" },
          timestamp: { type: "integer" },
        },
      },
      Candle: {
        type: "object",
        properties: {
          timestamp: { type: "integer" },
          open: { type: "number" },
          high: { type: "number" },
          low: { type: "number" },
          close: { type: "number" },
          volume: { type: "number" },
        },
      },
      NewsArticle: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string", nullable: true },
          url: { type: "string" },
          source: { type: "string" },
          author: { type: "string", nullable: true },
          publishedAt: { type: "string" },
          urlToImage: { type: "string", nullable: true },
          content: { type: "string", nullable: true },
          tickers: { type: "array", items: { type: "string" } },
          sentiment: { enum: ["bullish", "bearish", "neutral"], nullable: true },
          sentimentScore: { type: "number", nullable: true },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          strategyId: { type: "string", nullable: true },
          symbol: { type: "string" },
          side: { enum: ["buy", "sell"] },
          type: { enum: ["market", "limit", "stop"] },
          quantity: { type: "string" },
          limitPrice: { type: "string", nullable: true },
          stopPrice: { type: "string", nullable: true },
          status: { enum: ["pending", "filled", "cancelled", "rejected", "partial"] },
          filledQty: { type: "string" },
          avgFillPrice: { type: "string", nullable: true },
          createdAt: { type: "string" },
          filledAt: { type: "string", nullable: true },
          cancelledAt: { type: "string", nullable: true },
        },
      },
      Position: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          symbol: { type: "string" },
          quantity: { type: "string" },
          avgEntryPrice: { type: "string" },
          realizedPnl: { type: "string" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
      },
      PnlSummary: {
        type: "object",
        properties: {
          paperBalance: { type: "number" },
          equity: { type: "number" },
          unrealizedPnl: { type: "number" },
          realizedPnl: { type: "number" },
          positions: { type: "integer" },
          totalTradeCount: { type: "integer" },
        },
      },
    },
  },
  security: bearerSecurity,
  paths,
};

router.get("/openapi.json", (_req, res) => {
  res.json(spec);
});

router.get("/docs", (_req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aether Energy — Documentation</title>
  <style>
    :root { --bg: #0a0a0f; --card: #12121a; --border: rgba(255,255,255,0.06); --text: #e4e4e7; --muted: #71717a; --accent: #f59e0b; --accent2: #3b82f6; --green: #10b981; --red: #ef4444; --purple: #8b5cf6; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
    header { text-align: center; padding: 3rem 1rem 2rem; border-bottom: 1px solid var(--border); }
    header h1 { font-size: 2.5rem; font-weight: 700; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    header p { color: var(--muted); margin-top: 0.5rem; font-size: 1.1rem; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-live { background: rgba(16,185,129,0.15); color: var(--green); border: 1px solid rgba(16,185,129,0.3); }
    .badge-paper { background: rgba(245,158,11,0.15); color: var(--accent); border: 1px solid rgba(245,158,11,0.3); }
    .badge-free { background: rgba(139,92,246,0.15); color: var(--purple); border: 1px solid rgba(139,92,246,0.3); }
    nav { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; padding: 1rem 0; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
    nav a { color: var(--muted); text-decoration: none; font-size: 0.85rem; padding: 4px 10px; border-radius: 6px; transition: all 0.15s; }
    nav a:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    section { margin-bottom: 2.5rem; }
    section h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    section h2 .icon { font-size: 1.2rem; }
    h3 { font-size: 1rem; font-weight: 600; color: var(--accent); margin: 1.2rem 0 0.5rem; }
    p, li { color: var(--muted); font-size: 0.9rem; }
    ul { list-style: none; padding: 0; }
    ul li { padding: 4px 0; padding-left: 1.2rem; position: relative; }
    ul li::before { content: "→"; position: absolute; left: 0; color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1.2rem; transition: border-color 0.15s; }
    .card:hover { border-color: rgba(245,158,11,0.3); }
    .card h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
    .card p { font-size: 0.82rem; }
    .card .path { font-family: monospace; font-size: 0.75rem; color: var(--accent2); background: rgba(59,130,246,0.1); padding: 2px 6px; border-radius: 4px; margin-top: 0.5rem; display: inline-block; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; border-bottom: 1px solid var(--border); }
    td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
    td:first-child { font-family: monospace; color: var(--accent2); font-size: 0.8rem; }
    code { font-family: 'SF Mono', 'Fira Code', monospace; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.82rem; }
    .tip { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .tip strong { color: var(--green); }
    .warn { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .warn strong { color: var(--red); }
    footer { text-align: center; padding: 2rem 0; border-top: 1px solid var(--border); margin-top: 2rem; }
    footer p { font-size: 0.8rem; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } header h1 { font-size: 1.8rem; } }
  </style>
</head>
<body>
  <header>
    <h1>Aether Energy</h1>
    <p>AI-Powered Energy Commodity Trading Platform <span class="badge badge-live">Live</span> <span class="badge badge-paper">Paper</span> <span class="badge badge-free">Free Tier</span></p>
  </header>
  <div class="container">
    <nav>
      <a href="#quickstart">Quick Start</a>
      <a href="#market-data">Market Data</a>
      <a href="#trading">Trading</a>
      <a href="#strategies">Strategies</a>
      <a href="#backtest">Backtest</a>
      <a href="#agents">AI Agents</a>
      <a href="#portfolio">Portfolio</a>
      <a href="#intelligence">Intelligence</a>
      <a href="#tools">Tools</a>
      <a href="#data-sources">Data Sources</a>
      <a href="#account">Account</a>
      <a href="#api">API</a>
    </nav>

    <section id="quickstart">
      <h2><span class="icon">🚀</span> Quick Start</h2>
      <div class="grid">
        <div class="card">
          <h4>1. Create Account</h4>
          <p>Sign up with email + password. Free tier gives you full access to paper trading, backtesting, and 8 commodity symbols.</p>
        </div>
        <div class="card">
          <h4>2. Explore the Dashboard</h4>
          <p>The Overview page shows live market data, your portfolio, and recent signals. Everything updates in real-time via WebSocket.</p>
        </div>
        <div class="card">
          <h4>3. Run a Backtest</h4>
          <p>Pick a strategy (Mean Reversion, Momentum, Buy & Hold), a symbol, and a date range. Results come back in 1-10s with equity curves and metrics.</p>
        </div>
        <div class="card">
          <h4>4. Start Paper Trading</h4>
          <p>Place market, limit, or stop orders with virtual capital. Track P&L, positions, and order history — zero risk.</p>
        </div>
      </div>
    </section>

    <section id="market-data">
      <h2><span class="icon">📈</span> Market Data</h2>
      <p>Real-time and historical data for energy commodities, metals, and crypto:</p>
      <table>
        <thead><tr><th>Symbol</th><th>Name</th><th>Exchange</th><th>Source</th></tr></thead>
        <tbody>
          <tr><td>WTI</td><td>WTI Crude Oil</td><td>CME (CL=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>BRENT</td><td>Brent Crude Oil</td><td>ICE (BZ=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>NGAS</td><td>Natural Gas</td><td>CME (NG=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>GOLD</td><td>Gold</td><td>COMEX (GC=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>SILVER</td><td>Silver</td><td>COMEX (SI=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>COPPER</td><td>Copper</td><td>COMEX (HG=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>HEATOIL</td><td>Heating Oil</td><td>CME (HO=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>GASOL</td><td>RBOB Gasoline</td><td>CME (RB=F)</td><td>Yahoo / Finnhub</td></tr>
          <tr><td>BTC</td><td>Bitcoin</td><td>Binance</td><td>Binance WS</td></tr>
          <tr><td>ETH</td><td>Ethereum</td><td>Binance</td><td>Binance WS</td></tr>
          <tr><td>SOL</td><td>Solana</td><td>Binance</td><td>Binance WS</td></tr>
          <tr><td>BNB</td><td>Binance Coin</td><td>Binance</td><td>Binance WS</td></tr>
        </tbody>
      </table>
      <div class="tip"><strong>Tip:</strong> Use the Trade page for live charts, order books, and depth views. Switch between timeframes (1m, 5m, 15m, 1h, 1d). The Watchlist page lets you pin your favorite symbols.</div>
    </section>

    <section id="trading">
      <h2><span class="icon">💹</span> Paper Trading</h2>
      <p>Simulate real trading with virtual capital. All orders execute against live market prices with realistic slippage.</p>
      <div class="grid">
        <div class="card">
          <h4>Order Types</h4>
          <p><code>Market</code> — instant fill at current price<br><code>Limit</code> — fill at your price or better<br><code>Stop</code> — triggers at threshold</p>
        </div>
        <div class="card">
          <h4>P&L Tracking</h4>
          <p>Real-time unrealized and realized P&L. Paper balance, equity curve, trade count, and per-position metrics.</p>
        </div>
        <div class="card">
          <h4>Positions</h4>
          <p>Open positions update live. Average entry price, quantity, and P&L per position. Auto-close on stop/target.</p>
        </div>
        <div class="card">
          <h4>CSV Export</h4>
          <p>Download your full order history as CSV for analysis in Excel, Python, or R.</p>
        </div>
      </div>
      <div class="path">/dashboard/trading</div>
    </section>

    <section id="strategies">
      <h2><span class="icon">🧠</span> Strategies</h2>
      <p>Build, backtest, and deploy algorithmic trading strategies:</p>
      <div class="grid">
        <div class="card">
          <h4>My Strategies</h4>
          <p>Create custom strategies with entry/exit conditions (RSI, MACD, MA Crossover, Volume Spike). Enable/disable with one click.</p>
          <div class="path">/dashboard/strategies</div>
        </div>
        <div class="card">
          <h4>Strategy Templates</h4>
          <p>Pre-built templates: Mean Reversion, Momentum, Bollinger Breakout, RSI Divergence. Clone and customize.</p>
          <div class="path">/dashboard/library</div>
        </div>
        <div class="card">
          <h4>Strategy Optimizer</h4>
          <p>Grid-search over parameter combinations. Find the optimal lookback, threshold, and hold period for your strategy.</p>
          <div class="path">/dashboard/optimization</div>
        </div>
        <div class="card">
          <h4>Marketplace</h4>
          <p>Publish your strategies, rate others, and clone proven performers. Community-driven strategy discovery.</p>
          <div class="path">/dashboard/marketplace</div>
        </div>
      </div>
    </section>

    <section id="backtest">
      <h2><span class="icon">📊</span> Backtesting</h2>
      <p>Test strategies against historical data with realistic slippage and transaction costs:</p>
      <ul>
        <li>Supports 3 strategies: Mean Reversion, Momentum, Buy & Hold</li>
        <li>Configurable date ranges (3M, 6M, 1Y, 2Y) and initial balance</li>
        <li>Results include: Sharpe ratio, max drawdown, win rate, equity curve, trade list</li>
        <li>Compare up to 5 backtests side-by-side with normalized equity curves</li>
        <li>AI explanation: click "Explain with AI" for natural language analysis of results</li>
      </ul>
      <div class="path">/dashboard/backtest &nbsp;|&nbsp; /dashboard/comparison</div>
    </section>

    <section id="agents">
      <h2><span class="icon">🤖</span> AI Agents</h2>
      <p>Autonomous AI agents that monitor markets and execute strategies:</p>
      <div class="grid">
        <div class="card">
          <h4>Agent Fleet</h4>
          <p>6 specialized agents: Trading, Risk, Market Intelligence, Compliance, Portfolio, and Signal. Each runs independently.</p>
          <div class="path">/dashboard/agents</div>
        </div>
        <div class="card">
          <h4>Agent Team</h4>
          <p>Multi-agent coordination. Agents share signals and risk assessments. Orchestrate complex strategies across agents.</p>
          <div class="path">/dashboard/team</div>
        </div>
        <div class="card">
          <h4>Intelligence</h4>
          <p>Real-time agent metrics, benchmarks, and comparison. See which agents perform best on which symbols.</p>
          <div class="path">/dashboard/intelligence</div>
        </div>
        <div class="card">
          <h4>AI Assistant</h4>
          <p>Chat with the AI for market analysis, strategy suggestions, and portfolio advice. Powered by OpenAI or local Ollama.</p>
          <div class="path">/dashboard/ai</div>
        </div>
      </div>
    </section>

    <section id="portfolio">
      <h2><span class="icon">💼</span> Portfolio</h2>
      <p>Track your complete trading portfolio with analytics:</p>
      <ul>
        <li>Total value, P&L, and allocation breakdown by symbol</li>
        <li>Performance metrics: Sharpe ratio, Sortino ratio, max drawdown, Value at Risk</li>
        <li>30-day P&L chart with daily breakdown</li>
        <li>Open positions with live unrealized P&L</li>
        <li>Trade journal: annotate trades with thesis, lessons, tags, and ratings</li>
      </ul>
      <div class="path">/dashboard/portfolio &nbsp;|&nbsp; /dashboard/journal</div>
    </section>

    <section id="intelligence">
      <h2><span class="icon">📡</span> Intelligence & Analysis</h2>
      <p>Multi-factor analysis combining technical, fundamental, and sentiment data:</p>
      <div class="grid">
        <div class="card">
          <h4>Technical Analysis</h4>
          <p>RSI, MACD, Bollinger Bands, SMA/EMA crossovers, Stochastic, ATR, OBV. All computed in real-time.</p>
          <div class="path">/dashboard/analysis</div>
        </div>
        <div class="card">
          <h4>News Feed</h4>
          <p>Aggregated from GDELT + NewsAPI with sentiment scoring. Filter by symbol, sentiment, and source.</p>
          <div class="path">/dashboard/trade (News tab)</div>
        </div>
        <div class="card">
          <h4>Macro Dashboard</h4>
          <p>Federal funds rate, 10Y yield, yield curve, CPI, unemployment. Fed meeting calendar with countdown timers.</p>
          <div class="path">/dashboard/overview</div>
        </div>
        <div class="card">
          <h4>Pipeline & Ops</h4>
          <p>Live data flow observability. See which adapters are healthy, ingest latency, and pipeline metrics.</p>
          <div class="path">/dashboard/pipeline</div>
        </div>
      </div>
    </section>

    <section id="tools">
      <h2><span class="icon">🔧</span> Trading Tools</h2>
      <div class="grid">
        <div class="card">
          <h4>Price Alerts</h4>
          <p>Set price thresholds for any symbol. Get notified via email when triggered. Supports above/below/crosses conditions.</p>
          <div class="path">/dashboard/alerts</div>
        </div>
        <div class="card">
          <h4>Watchlist</h4>
          <p>Pin your favorite symbols for quick access. Persists across sessions. Auto-refreshes prices every 60s.</p>
          <div class="path">/dashboard/watchlist</div>
        </div>
        <div class="card">
          <h4>Position Sizing</h4>
          <p>Calculate optimal position size based on risk tolerance, account size, and stop-loss level. Kelly criterion included.</p>
          <div class="path">/dashboard/position-sizing</div>
        </div>
        <div class="card">
          <h4>Idea Extractor</h4>
          <p>Paste a trading idea or article. AI extracts entry/exit conditions, risk parameters, and converts to a backtestable strategy.</p>
          <div class="path">/dashboard/extractor</div>
        </div>
      </div>
    </section>

    <section id="data-sources">
      <h2><span class="icon">🛰️</span> Data Sources</h2>
      <p>13 independent data adapters, each fault-tolerant with cache fallback:</p>
      <table>
        <thead><tr><th>Source</th><th>Type</th><th>Auth</th><th>Rate Limit</th></tr></thead>
        <tbody>
          <tr><td>Yahoo Finance</td><td>Market quotes + candles</td><td>None (free)</td><td>~2000 req/day</td></tr>
          <tr><td>Finnhub</td><td>Market quotes + WebSocket</td><td>Free API key</td><td>60 req/min</td></tr>
          <tr><td>Alpha Vantage</td><td>Technical indicators</td><td>Free API key</td><td>25 req/day</td></tr>
          <tr><td>Binance</td><td>Crypto + WebSocket</td><td>None (free)</td><td>Unlimited</td></tr>
          <tr><td>FRED</td><td>Macro economics</td><td>Free API key</td><td>120 req/min</td></tr>
          <tr><td>Open-Meteo</td><td>Weather (HDD/CDD)</td><td>None (free)</td><td>10,000/day</td></tr>
          <tr><td>Alternative.me</td><td>Fear & Greed Index</td><td>None (free)</td><td>Daily</td></tr>
          <tr><td>Binance Futures</td><td>Open Interest, funding</td><td>None (free)</td><td>Unlimited</td></tr>
          <tr><td>CFTC</td><td>COT Reports</td><td>None (free)</td><td>Weekly</td></tr>
          <tr><td>EIA (DOE)</td><td>Energy fundamentals</td><td>Free API key</td><td>2,500/day</td></tr>
          <tr><td>NewsAPI</td><td>Curated headlines</td><td>Free API key</td><td>100/day</td></tr>
          <tr><td>GDELT</td><td>Global news</td><td>None (free)</td><td>1 req/sec</td></tr>
          <tr><td>Ollama</td><td>Local LLM (sentiment)</td><td>Self-hosted</td><td>Unlimited</td></tr>
        </tbody>
      </table>
      <div class="tip"><strong>Tip:</strong> Most features work without API keys. Add keys for enhanced data: <code>FINNHUB_API_KEY</code>, <code>ALPHA_VANTAGE_API_KEY</code>, <code>FRED_API_KEY</code>, <code>EIA_API_KEY</code>, <code>NEWSAPI_KEY</code>. Set them in your account settings or environment.</div>
    </section>

    <section id="account">
      <h2><span class="icon">👤</span> Account & Security</h2>
      <div class="grid">
        <div class="card">
          <h4>Authentication</h4>
          <p>Email + password with JWT tokens. Optional 2FA via TOTP authenticator app. Backup codes provided on enable.</p>
        </div>
        <div class="card">
          <h4>KYC</h4>
          <p>Upload identity documents for live trading verification. Required before switching from paper to live mode.</p>
          <div class="path">/dashboard/kyc</div>
        </div>
        <div class="card">
          <h4>Risk Management</h4>
          <p>Set max position size, daily loss limit, max open orders, and kill switch. All orders validated against limits.</p>
          <div class="path">/dashboard/settings</div>
        </div>
        <div class="card">
          <h4>API Keys</h4>
          <p>Generate API keys for programmatic access. Scoped permissions (read:trades, write:orders, admin). Rate-limited per scope.</p>
          <div class="path">/dashboard/api-keys</div>
        </div>
      </div>
      <div class="warn"><strong>GDPR:</strong> You can export all your data (Art. 20) or request account deletion (Art. 17) from Settings. Audit log records all account activity.</div>
    </section>

    <section id="api">
      <h2><span class="icon">⚡</span> API Reference</h2>
      <p>Full REST API with OpenAPI 3.1 spec. All endpoints return JSON. Authentication via Bearer JWT token.</p>
      <div class="grid">
        <div class="card">
          <h4>OpenAPI Spec</h4>
          <p>Machine-readable API specification with all endpoints, schemas, and response types.</p>
          <div class="path"><a href="/api/openapi.json" style="color: var(--accent2);">/api/openapi.json</a></div>
        </div>
        <div class="card">
          <h4>Swagger UI</h4>
          <p>Interactive API explorer. Try requests directly from the browser with persistent auth.</p>
          <div class="path"><a href="/api/swagger" style="color: var(--accent2);">/api/swagger</a></div>
        </div>
        <div class="card">
          <h4>Health Checks</h4>
          <p><code>/live</code> — liveness probe<br><code>/ready</code> — DB + Redis readiness<br><code>/metrics</code> — Prometheus format</p>
        </div>
        <div class="card">
          <h4>Rate Limits</h4>
          <p>100 req/15min general. 60/min API. 10/min backtests. 20/min AI. 30/min market data.</p>
        </div>
      </div>
    </section>
  </div>
  <footer>
    <p>Aether Energy v1.0.0 · Real-time energy commodity trading platform</p>
    <p style="margin-top:0.5rem"><a href="/" style="color: var(--accent); text-decoration: none;">Home</a> · <a href="/api/openapi.json" style="color: var(--accent2); text-decoration: none;">API</a> · <a href="/api/swagger" style="color: var(--accent2); text-decoration: none;">Swagger</a> · <a href="/status" style="color: var(--green); text-decoration: none;">Status</a></p>
  </footer>
</body>
</html>`);
});

export default router;
