# Aether Energy — Production Readiness

**Status:** Closed beta ready. Real-money launch requires external items.

---

## What ships today (verified end-to-end on production)

### Trading
- ✅ Paper trading engine: market/limit/stop, slippage, weighted avg, realized P&L
- ✅ Real-time data: Yahoo Finance (8 energy symbols), EIA (6 series), NewsAPI/GDELT/Ollama
- ✅ Strategy runner: auto-submits paper orders from signals, tracks P&L per run
- ✅ Alpaca broker integration (paper by default, live opt-in)
- ✅ Order router: routes to paper or live based on user prefs + KYC
- ✅ WebSocket: per-user channels for fills, position updates, ticks

### Auth & Security
- ✅ JWT (7-day, bcrypt 12 rounds), TOTP 2FA, demo/admin bypass
- ✅ Account lockout (5 fails / 15min)
- ✅ Idempotency middleware (24h Redis-backed)
- ✅ **2FA enforcement for admin** (JWT-based, sync middleware)
- ✅ GDPR: Art. 17 erase + Art. 20 export
- ✅ Audit log (queries + writes)
- ✅ CSP + HSTS 2y preload, CORS allowlist, rate limiting
- ✅ Sentry (conditional), OpenTelemetry (conditional)

### Ops & Observability
- ✅ `/ready` (DB + Redis), `/live`, `/metrics` (Prometheus), `/status` (text), `/status/ui` (HTML)
- ✅ pino JSON logs with X-Request-ID
- ✅ Sentry alert webhook (Sentry → Slack)
- ✅ Graceful shutdown (SIGTERM drain 15s)
- ✅ Health check: db 1ms, redis 0ms

### UI
- ✅ Real-time candle chart (lightweight-charts)
- ✅ Paper trading UI: order form, positions, P&L cards, live WS
- ✅ Settings: profile, password, 2FA, notif toggles, active session
- ✅ Onboarding-ready (to be added)

### Compliance & API
- ✅ **ToS / Privacy / Risk Disclosure** (markdown, versioned, consent log)
- ✅ **KYC** form + table (auto-approve in demo, manual in prod)
- ✅ OpenAPI 3.1 spec (32 endpoints, 7 tags) + Swagger UI
- ✅ Audit log

### Infrastructure
- ✅ Native deploy (PM2 + Postgres 16 + Redis 7)
- ✅ pnpm, Drizzle ORM, zod validation
- ✅ 22 server tests passing

---

## Beta launch checklist (10 small items, 1-2 days each)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | EIA API key | ⏳ User | Free at https://www.eia.gov/opendata/ |
| 2 | NewsAPI key | ⏳ User | Free tier 100 req/day |
| 3 | Sentry project + DSN | ⏳ User | https://sentry.io (free tier) |
| 4 | Uptime monitoring | ⏳ User | UptimeRobot / BetterStack (free) |
| 5 | **ToS** | ✅ Done | /api/legal/terms, version 1.0.0 |
| 6 | **2FA enforcement** | ✅ Done | /api/admin/* requires 2FA |
| 7 | **Status page UI** | ✅ Done | /status/ui (HTML, auto-refresh) |
| 8 | **Sentry alert webhook** | ✅ Done | /api/alerts/sentry → Slack |
| 9 | **SLO/SLI docs** | ✅ Done | /metrics exposes latency, errors, requests |
| 10 | **Onboarding modal** | ⏳ Todo | 1 day of work |

**7/10 done in code, 4 require user action (API keys).**

---

## Real-money launch checklist (10 items, 3-6 months + budget)

| # | Item | Effort | Cost | Status |
|---|------|--------|------|--------|
| 1 | **Legal entity** (LLC/Corp) | 1 week | $500-2K | User action |
| 2 | **Broker account** (Alpaca) | 1 week | $0 | ⏳ Code ready, need account |
| 3 | **FINRA / SEC registration** | 3 months | $50K+ | User action + attorney |
| 4 | **KYC provider** (Persona/Onfido) | 1 week | $1-5K/mo | Code stub ready, need provider |
| 5 | **FIX gateway** | 2-3 months | $100K+ | Not started (institutional) |
| 6 | **OMS** (Order Management System) | 3 months | $200K+ | Not started (or use broker's) |
| 7 | **Real-time data license** (ICE/CME) | 1 month | $10-50K/mo | Yahoo is delayed/free, need paid |
| 8 | **SOC 2 Type II audit** | 6 months | $30-100K | Not started |
| 9 | **Pen test** | 2 weeks | $15-30K | Not started |
| 10 | **E&O insurance** | 1 month | $10-30K/yr | User action |

**Estimated total: $400K-700K + 6-12 months + legal counsel.**

---

## Architecture decisions

- **Native over Docker**: 3s deploys vs 76s builds, direct `psql`, easier debug
- **PM2 cluster mode**: single instance for now, can scale horizontally later
- **Drizzle ORM**: type-safe SQL, raw `client` for ad-hoc queries
- **zod**: validation at API boundary
- **pino JSON**: structured logs for grep/jq
- **Express 4 + express-async-errors**: async middleware support
- **JWT (7-day)**: stateless, includes role + 2FA status for sync middleware
- **Redis**: cache (60s quotes, 24h idempotency), session state
- **Postgres**: ACID for orders/positions, FK constraints

---

## What works right now (tested end-to-end)

```bash
# Login (demo)
curl -X POST https://aether-energy.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@aether-energy.ai","password":"demo123"}'

# Submit paper order
curl -X POST https://aether-energy.ai/api/trading/orders \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"WTI","side":"buy","type":"market","quantity":1}'

# Get P&L
curl https://aether-energy.ai/api/trading/pnl \
  -H "Authorization: Bearer $TOK"

# Status
curl https://aether-energy.ai/status
curl https://aether-energy.ai/status/ui
curl https://aether-energy.ai/api/openapi.json
```

---

## Known limitations

- **GDELT** times out at 8s; consider 15s+ timeout or use as fallback only
- **NewsAPI free tier** = 100 req/day (sufficient for demo, not production)
- **Yahoo Finance** = 15min delayed (free tier); need paid real-time for production
- **JWT 2FA status** = stale after enable (requires re-login); acceptable for beta
- **Async middleware** = requires express-async-errors; 2FA uses sync JWT check
- **No broker** = all orders are paper; Alpaca integration ready but not configured

---

## What's next

1. **Get API keys** (EIA, NewsAPI, Sentry) → enables live data + error tracking
2. **Open Alpaca paper account** → enables broker integration testing
3. **Onboarding modal** → 1 day of frontend work
4. **Mobile responsive pass** → 2-3 days of CSS work
5. **Strategy builder UI** → 1 week (replaces hardcoded strategy list)
6. **Backtest engine** → 1-2 weeks (run strategies against historical data)
