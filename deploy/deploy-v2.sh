#!/bin/bash
# ─── Aether Energy — Enterprise v2 deploy ───────────────────────────────
# Run this from the VPS console if SSH is blocked.
# Usage: bash /root/deploy-v2.sh
set -e

cd /root/aether-energy
echo "=== 1. Pull + build ==="
git fetch origin
git reset --hard origin/main
pnpm install --frozen-lockfile 2>&1 | tail -2
pnpm build 2>&1 | tail -2

echo
echo "=== 2. Install pgBouncer ==="
if ! command -v pgbouncer &>/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt install -y pgbouncer 2>&1 | tail -2
fi
cp /root/aether-energy/deploy/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
chmod 640 /etc/pgbouncer/pgbouncer.ini

# Build userlist with md5-hashed password
PASS=$(sed -nE 's/^DATABASE_URL=postgres:\/\/[^:]+:([^@]+)@.*/\1/p' /root/aether-energy/.env)
USER="aether"
MD5HASH=$(echo -n "${PASS}${USER}" | md5sum | awk '{print $1}')
echo "\"${USER}\" \"md5${MD5HASH}\"" > /etc/pgbouncer/userlist.txt
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/userlist.txt

systemctl enable pgbouncer 2>/dev/null
systemctl restart pgbouncer
sleep 1

# Update .env to use pgBouncer
sed -i -E 's|@127\.0\.0\.1:5433|@127.0.0.1:6432|g; s|@localhost:5433|@127.0.0.1:6432|g' /root/aether-energy/.env
echo "  .env updated to use pgBouncer (port 6432)"

echo
echo "=== 3. Restart Aether ==="
pm2 delete aether 2>/dev/null || true
pm2 start /root/aether-energy/ecosystem.config.cjs
pm2 save --force
sleep 4

echo
echo "=== 4. Verify ==="
echo "--- PM2 status ---"
pm2 status aether | tail -3 | head -2
echo "--- /ready ---"
curl -s http://127.0.0.1:3000/ready | python3 -m json.tool
echo "--- pgBouncer test ---"
PGPASSWORD="$PASS" psql -h 127.0.0.1 -p 6432 -U aether -d aether -c "SELECT current_database(), current_user;" 2>&1 | head -5

echo
echo "=== 5. Run tests ==="
pnpm test -- server/__tests__ 2>&1 | tail -5

echo
echo "=== DONE ==="
echo "If /ready shows status:ready, deployment succeeded."
echo "If pgBouncer test shows 'aether' as user, pooling is active."
