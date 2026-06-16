#!/bin/bash
# ─── Install + configure pgBouncer on Ubuntu ───────────────────────────
set -e

if [ "$(id -u)" -ne 0 ]; then echo "Run as root"; exit 1; fi

echo "=== 1. Install pgBouncer ==="
DEBIAN_FRONTEND=noninteractive apt install -y pgbouncer 2>&1 | tail -2

echo "=== 2. Copy config ==="
cp /root/aether-energy/deploy/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
chmod 640 /etc/pgbouncer/pgbouncer.ini

echo "=== 3. Build userlist.txt (md5-hashed password) ==="
PASS=$(sed -nE 's/^DATABASE_URL=postgres:\/\/[^:]+:([^@]+)@.*/\1/p' /root/aether-energy/.env)
USER="aether"
# pgbouncer userlist format: "user" "md5<password_hash>"
# Use postgres' stored md5(password + user) format
MD5HASH=$(echo -n "${PASS}${USER}" | md5sum | awk '{print $1}')
echo "\"${USER}\" \"md5${MD5HASH}\"" > /etc/pgbouncer/userlist.txt
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/userlist.txt

echo "=== 4. Enable + restart ==="
systemctl enable pgbouncer
systemctl restart pgbouncer
sleep 1
systemctl status pgbouncer --no-pager | head -3

echo "=== 5. Test ==="
PGPASSWORD="$PASS" psql -h 127.0.0.1 -p 6432 -U aether -d aether -c "SELECT current_database(), current_user, version();" 2>&1 | head -3

echo
echo "=== pgBouncer is up on 127.0.0.1:6432 ==="
echo "Update .env: DATABASE_URL=postgres://aether:PASS@127.0.0.1:6432/aether"
echo "Then pm2 restart aether"
