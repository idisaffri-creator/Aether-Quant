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
  <title>Aether Energy API · Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        tryItOutEnabled: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`);
});

export default router;
