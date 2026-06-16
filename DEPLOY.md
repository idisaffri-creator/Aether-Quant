# Deployment (native, no Docker)

This app runs natively on the VPS — Node via PM2, PostgreSQL via apt, reverse-proxy through the shared Traefik.

## Stack

| Component | Where | Port |
|---|---|---|
| Node app (PM2) | `/root/aether-energy/dist/index.js` | 3000 |
| PostgreSQL (cluster `aether`) | `localhost:5433` (5432 reserved for another app) | 5433 |
| Traefik (shared) | Docker `sh4dow-traefik-1` | 80, 443 |

## One-time VPS setup

```bash
bash setup-vps.sh   # installs pnpm, pm2, postgres cluster, caddy; creates user/db
```

## Configure Traefik

In `/opt/sh4dow/docker/traefik/dynamic.yml` (file provider, auto-reloads):

```yaml
http:
  routers:
    aether:
      rule: "Host(`aether-energy.ai`) || Host(`www.aether-energy.ai`)"
      entryPoints: ["web", "websecure"]
      service: aether-service
      tls: { certResolver: letsencrypt }
  services:
    aether-service:
      loadBalancer:
        servers: [{ url: "http://172.17.0.1:3000" }]
```

Restart: `docker restart sh4dow-traefik-1`

## Daily deploy

```bash
cd /root/aether-energy
./deploy.sh   # git pull → pnpm install → pnpm build → pm2 reload
```

## Rollback

```bash
cd /root/aether-energy
git checkout <previous-sha>
pnpm build
pm2 reload aether
# or
pm2 revert aether   # uses PM2's saved previous process
```

## Useful commands

```bash
pm2 logs aether --lines 100      # app logs
pm2 status                        # process status
pm2 monit                         # live CPU/mem
journalctl -u pm2-root -f         # systemd logs (if pm2 startup installed)
sudo -u postgres psql -p 5433 aether_energy  # DB shell
pg_dump -h 127.0.0.1 -p 5433 -U aether aether_energy | gzip > backup.sql.gz  # backup
```

## Environment variables (.env)

- `DATABASE_URL` — `postgres://aether:PASS@localhost:5433/aether_energy`
- `JWT_SECRET` — 7-day token signing key
- `CORS_ORIGIN` — `https://aether-energy.ai` (or `*` for dev)
- `NODE_ENV` — `production`
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` — global limiter

## Cache strategy

- `index.html` and SPA routes → `no-cache, no-store, must-revalidate` (always re-fetch)
- `/assets/*` (Vite-hashed) → `1 year immutable`
- Other static files → `1 hour`

Configured in `server/index.ts` static middleware.
