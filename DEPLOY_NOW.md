# Aether Energy — Manual Deploy (SSH blocked)

## Status
- HTTPS (port 443) ✅ live at https://aether-energy.ai
- HTTP/Metrics/Auth endpoints ✅ verified earlier
- SSH (port 22) ❌ refused (likely fail2ban from repeated attempts; or sshd stopped)

## What's committed and ready
- `a333f03` Sentry + OTel + pgBouncer + more tests
- `f7bb022` Manual deploy-v2.sh script
- `b7d57fc` Health endpoint + export postgres client
- All on `main` branch, on GitHub

## Run this on the VPS console (cloud provider's web shell)

```bash
# 1. Get console access via your provider (Contabo / DigitalOcean / etc.)
# 2. Login as root
# 3. Run this single command:

cd /root/aether-energy && curl -s https://raw.githubusercontent.com/idisaffri-creator/Aether-Quant/main/deploy/deploy-v2.sh -o /tmp/v2.sh && bash /tmp/v2.sh

# Or copy-paste this:

set -e
cd /root/aether-energy
git fetch origin
git reset --hard origin/main
pnpm install --frozen-lockfile 2>&1 | tail -2
pnpm build 2>&1 | tail -2

# Install pgBouncer
if ! command -v pgbouncer &>/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt install -y pgbouncer
fi
cp /root/aether-energy/deploy/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
chmod 640 /etc/pgbouncer/pgbouncer.ini

PASS=$(sed -nE 's/^DATABASE_URL=postgres:\/\/[^:]+:([^@]+)@.*/\1/p' /root/aether-energy/.env)
MD5HASH=$(echo -n "${PASS}aether" | md5sum | awk '{print $1}')
echo "\"aether\" \"md5${MD5HASH}\"" > /etc/pgbouncer/userlist.txt
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/userlist.txt

systemctl enable pgbouncer
systemctl restart pgbouncer
sleep 1

# Update .env to use pgBouncer (port 6432)
sed -i -E 's|@127\.0\.0\.1:5433|@127.0.0.1:6432|g; s|@localhost:5433|@127.0.0.1:6432|g' /root/aether-energy/.env

# Restart aether
pm2 delete aether 2>/dev/null || true
pm2 start /root/aether-energy/ecosystem.config.cjs
pm2 save --force
sleep 4

# Verify
pm2 status aether
curl -s http://127.0.0.1:3000/ready | python3 -m json.tool
PGPASSWORD="$PASS" psql -h 127.0.0.1 -p 6432 -U aether -d aether -c "SELECT current_database(), current_user;"

# Run tests
pnpm test -- server/__tests__
```

## Expected output

```
status: ready
database: ok=true (0-2ms)
redis: ok=true (0-1ms)

aether | aether | PostgreSQL 16.14...   ← via pgBouncer

Tests: 13 passed
```

## If you need to unban my IP first

On the VPS console:
```bash
fail2ban-client set sshd unbanip 103.232.219.4
# or check current bans
fail2ban-client status sshd
```

Then I can resume the automated deploys.
