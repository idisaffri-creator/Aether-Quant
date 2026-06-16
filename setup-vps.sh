#!/bin/bash
# Aether Energy — one-time VPS setup (Ubuntu 24.04)
# Run as root: bash setup-vps.sh
set -euo pipefail

echo "=== Aether Energy VPS setup ==="

# 1. Node 24 (assumes already installed)
echo "--- Node ---"
node -v || { echo "Node not found, install Node 24 first"; exit 1; }

# 2. pnpm via corepack
echo "--- pnpm ---"
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm -v

# 3. PM2
echo "--- PM2 ---"
npm install -g pm2
pm2 -v
pm2 update  # sync daemon to local
echo "  Run: pm2 startup    (then execute the printed sudo command)"

# 4. PostgreSQL 16 (native, alongside any existing cluster)
echo "--- PostgreSQL ---"
apt update -qq
DEBIAN_FRONTEND=noninteractive apt install -y postgresql postgresql-client
# Create aether cluster on port 5433 (5432 may be in use by another app)
if ! pg_lsclusters | grep -q "16.*aether.*5433"; then
  pg_createcluster 16 aether --port 5433 --start
fi
pg_lsclusters

# 5. Create DB user/db
echo "--- DB user/db ---"
read -rs -p "  Enter Aether DB password: " DBPASS; echo
sudo -u postgres psql -p 5433 -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aether') THEN
    CREATE USER aether WITH PASSWORD '${DBPASS}' SUPERUSER;
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -p 5433 -c "SELECT 'CREATE DATABASE aether_energy OWNER aether' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'aether_energy')\gexec" || true

echo "  Connection test:"
PGPASSWORD="$DBPASS" psql -h 127.0.0.1 -p 5433 -U aether -d aether_energy -c "SELECT version();" | head -3

# 6. Caddy (optional, for direct TLS without Traefik)
echo "--- Caddy (optional) ---"
if ! command -v caddy &>/dev/null; then
  apt install -y caddy
fi
caddy version

echo
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. cd /root/aether-energy"
echo "  2. Update .env: DATABASE_URL=postgres://aether:PASS@localhost:5433/aether_energy"
echo "  3. pnpm install --frozen-lockfile && pnpm build"
echo "  4. pm2 start dist/index.js --name aether -i 1"
echo "  5. pm2 startup && pm2 save"
echo "  6. If using Traefik: repoint aether-service to http://172.17.0.1:3000"
