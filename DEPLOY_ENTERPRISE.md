# Aether Energy — Enterprise Operations

This is the production operations runbook for a single-VPS deployment with full observability, security hardening, and zero-downtime deploys.

## Stack

| Layer | Component | Where |
|---|---|---|
| Web | Node 24 + PM2 (cluster) | `/root/aether-energy/dist/index.js` |
| API | Express + Pino + Zod | same process |
| WebSocket | ws + Redis pub/sub | same process |
| DB | PostgreSQL 16 (cluster `aether`, port 5433) | native |
| Cache/Queue | Redis 7 | `localhost:6379` |
| Proxy | Traefik (shared, in Docker) | external |
| Logs | Pino JSON → stdout | journald/PM2 |
| Metrics | Prometheus exposition at `/metrics` | scrape by Prom |
| Backups | `pg_dump` + cron + 7-day retention | `/backups/aether` |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | basic liveness |
| GET | `/live` | liveness probe (no deps) |
| GET | `/ready` | readiness probe (checks DB + Redis) |
| GET | `/metrics` | Prometheus exposition |
| POST | `/api/csp-report` | CSP violation reports |
| GET | `/api/audit?...` | Audit log (self for users, all for admin) |
| GET | `/api/auth/me/export` | GDPR Art. 20 export |
| DELETE | `/api/auth/me` | GDPR Art. 17 erase |
| POST | `/api/auth/2fa/setup` | Begin 2FA enrollment |
| POST | `/api/auth/2fa/verify` | Confirm TOTP, enable 2FA |
| POST | `/api/auth/2fa/disable` | Disable 2FA (password confirm) |
| GET | `/api/auth/2fa/status` | 2FA state |

## Security headers (set by `helmet`)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; ...`
- `Cross-Origin-Opener-Policy: same-origin`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: ...` (delegated to helmet defaults)

## Request flow

```
Traefik (TLS, HSTS)
   ↓
helmet (CSP, HSTS, COOP)
   ↓
requestId (X-Request-ID propagation)
   ↓
requestLogger (Pino + Prometheus)
   ↓
shutdownMiddleware (503 if shutting down)
   ↓
cors, compression, json
   ↓
idempotency (Idempotency-Key)
   ↓
auditLogger, rateLimit
   ↓
route handler
```

## Observability

### Logs

Structured JSON to stdout. Ingest with Promtail → Loki or vector → ELK.

```json
{
  "level": "info",
  "time": "2026-06-16T15:00:00.000Z",
  "service": "aether-energy",
  "env": "production",
  "requestId": "uuid",
  "method": "GET",
  "path": "/api/auth/me",
  "status": 200,
  "durationMs": 12,
  "userId": "abc123",
  "ip": "1.2.3.4"
}
```

### Metrics

Scrape `/metrics` every 15-30s. Default process metrics (CPU, mem, event loop lag, GC) plus:

- `http_requests_total{method,route,status}`
- `http_request_duration_seconds{...}` (histogram)
- `ws_active_connections` (gauge)
- `auth_failures_total{reason}` (counter)
- `cache_hits_total{key}` / `cache_misses_total{key}`
- `db_query_duration_seconds{op,table}` (histogram)

### Alerts (Prometheus rules)

```yaml
groups:
- name: aether
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    annotations: { summary: "5xx rate > 5%" }
  - alert: SlowRequests
    expr: histogram_quantile(0.95, http_request_duration_seconds_bucket[5m]) > 1
    for: 5m
    annotations: { summary: "p95 latency > 1s" }
  - alert: ProcessDown
    expr: up{job="aether"} == 0
    for: 1m
    annotations: { summary: "Aether app unreachable" }
  - alert: LoginLockouts
    expr: increase(auth_failures_total[5m]) > 50
    annotations: { summary: "Brute force in progress" }
```

## Deploy

```bash
cd /root/aether-energy
./deploy.sh         # git pull → pnpm install → pnpm build → pm2 reload
```

CI deploy: push to `main` triggers `.github/workflows/deploy.yml` (requires `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` secrets).

## Rollback

```bash
git checkout <previous-sha> && pnpm build && pm2 reload aether
# or
pm2 revert aether   # PM2's built-in previous-process swap
```

## Backups

Daily 3am cron:
```cron
0 3 * * * /root/aether-energy/scripts/backup.sh >> /var/log/aether-backup.log 2>&1
```

Verify last backup:
```bash
ls -lh /backups/aether/ | tail -5
sha256sum -c /backups/aether/$(ls -t /backups/aether/*.sha256 | head -1 | xargs basename)
```

Restore:
```bash
pg_restore -h 127.0.0.1 -p 5433 -U aether -d aether_energy --clean --if-exists /backups/aether/aether-20260616-030000.dump
```

## SLOs

| SLI | Target | Measurement |
|---|---|---|
| Availability | 99.9% monthly | `(1 - error_budget_burn) * 100` |
| Latency p95 | < 500ms | `histogram_quantile(0.95, ...)` |
| Latency p99 | < 2s | `histogram_quantile(0.99, ...)` |
| Error rate | < 0.1% | `rate(http_requests_total{status=~"5.."}[5m])` |
| DB query p95 | < 100ms | `db_query_duration_seconds` |

## Incident response

1. `pm2 logs aether --lines 200` — check recent errors
2. `pm2 monit` — live CPU/mem
3. Check `/ready` for dependency health
4. Check Traefik access log: `docker logs sh4dow-traefik-1 --tail 100`
5. Check Postgres: `sudo -u postgres psql -p 5433 -c "SELECT * FROM pg_stat_activity"`
6. Check Redis: `redis-cli INFO stats`
7. Rollback: `git checkout HEAD~1 && pnpm build && pm2 reload aether`

## Capacity & scaling

| Concurrent users | What you need |
|---|---|
| 100 | Current setup |
| 1,000 | + Redis cache, pgBouncer |
| 10,000 | + horizontal PM2 (2-3 instances), Redis pub/sub for WS |
| 100,000 | + dedicated DB replica, CDN, k8s |

## Hardening checklist (✅ done this turn)

- [x] Structured JSON logging (pino)
- [x] Request ID propagation (X-Request-ID)
- [x] /health, /live, /ready, /metrics
- [x] Graceful shutdown (SIGTERM drains in 15s)
- [x] Prometheus metrics
- [x] Strict CSP with report-only mode
- [x] HSTS 2-year preload-eligible
- [x] CORS strict allowlist
- [x] Redis install + client
- [x] Idempotency middleware (24h Redis-backed)
- [x] Account lockout (5 fails / 15min)
- [x] 2FA TOTP (otplib + qrcode)
- [x] Audit log writer (DB) + query API
- [x] GDPR export + delete
- [x] DB hot-path indexes
- [x] Connection pool (pg.Pool ready, pgBouncer config documented)
- [x] .env.example (full)
- [x] Backup script (cron, retention, SHA256)
- [x] GitHub Actions CI (lint, typecheck, test, secret-scan, build)
- [x] Vitest setup + sample test
- [x] Per-user rate limit (alongside per-IP)

## Still to do (next batch)

- [ ] Sentry init (when SENTRY_DSN is set)
- [ ] OpenTelemetry tracing (works with SigNoz / Jaeger / Datadog)
- [ ] WS real Redis pub/sub fanout (for Phase 1 real-time data)
- [ ] pgBouncer install + config
- [ ] Status page (statuspage.io or self-hosted)
- [ ] Status badges in README
- [ ] Per-tenant rate limits (when RBAC added)
- [ ] RBAC + SSO (SAML/OIDC) for B2B
- [ ] DR runbook + quarterly test
- [ ] Pen test (annual, external)

## External (not built; budget)

| Item | Cost | Time |
|---|---|---|
| Pen test | $5-15k | annual |
| SOC 2 Type II | $30-80k | 6-12 months |
| Bug bounty (HackerOne) | variable | optional |
| KYC/AML (Persona/Onfido) | $1-5/user | when launching real trading |
| Legal entity + ToS/Privacy review | $5-10k | one-time |
| Errors & omissions insurance | $2-10k/yr | before going live with money |
