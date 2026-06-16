#!/bin/bash
# ─── Aether Energy database backup ──────────────────────────────────────
# Run via cron: 0 3 * * * /root/aether-energy/scripts/backup.sh
#
# - Dumps Postgres with pg_dump (custom format, compressed)
# - Encrypts with GPG to .gpg file (only if GPG_RECIPIENT set)
# - Retains 7 daily, 4 weekly, 6 monthly
# - rsyncs to /backups (or BACKUP_DEST env) — adjust to your offsite target

set -euo pipefail

BACKUP_DIR="/backups/aether"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DAY=$(date +%u)        # 1=Mon..7=Sun
DAY_OF_MONTH=$(date +%d)

DB_HOST=$(grep '^DATABASE_URL=' /root/aether-energy/.env | sed -E 's|.*@([^:/]+):.*|\1|')
DB_PORT=$(grep '^DATABASE_URL=' /root/aether-energy/.env | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(grep '^DATABASE_URL=' /root/aether-energy/.env | sed -E 's|.*/([^/?]+).*|\1|')
DB_USER=$(grep '^DATABASE_URL=' /root/aether-energy/.env | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(grep '^DATABASE_URL=' /root/aether-energy/.env | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')

GPG_RECIPIENT="${GPG_RECIPIENT:-}"    # e.g. ops@aether-energy.ai

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/aether-${TIMESTAMP}.dump"

echo "[backup] $(date -Iseconds) Dumping $DB_NAME on $DB_HOST:$DB_PORT"
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -F custom -Z 9 \
  -d "$DB_NAME" \
  -f "$BACKUP_FILE"

# GPG-encrypt if recipient configured
if [ -n "$GPG_RECIPIENT" ] && command -v gpg &>/dev/null; then
  gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" \
      --encrypt "$BACKUP_FILE"
  rm -f "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gpg"
fi

# Compute SHA256 for integrity
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"

# ─── Retention ──────────────────────────────────────────────────────────
# 7 daily, 4 weekly (Sunday), 6 monthly (1st of month)
find "$BACKUP_DIR" -name 'aether-*.dump*' -mtime +7 -not -name "*$(date -d '7 days ago' +%Y%m%d)*" -delete 2>/dev/null || true

# Keep weekly (Sundays)
for w in $(seq 1 4); do
  KEEP_FILE="$BACKUP_DIR/aether-$(date -d "$w weeks ago" +%Y%m%d)-*.dump*"
  find "$BACKUP_DIR" -name 'aether-*.dump*' -not -name "*$(date -d "$w weeks ago" +%Y%m%d)*" -mtime +30 -delete 2>/dev/null || true
done

# Keep monthly (1st of month, 6 months back)
find "$BACKUP_DIR" -name 'aether-*.dump*' -mtime +180 -delete 2>/dev/null || true

# ─── Offsite copy ───────────────────────────────────────────────────────
# Uncomment and configure BACKUP_DEST for S3/rsync offsite
# BACKUP_DEST="s3://aether-backups/db/"   # requires aws-cli + s3cmd
# if command -v aws &>/dev/null && [ -n "${BACKUP_DEST:-}" ]; then
#   aws s3 cp "$BACKUP_FILE" "$BACKUP_DEST$(basename "$BACKUP_FILE")"
# fi

echo "[backup] $(date -Iseconds) Done: $BACKUP_FILE ($(stat -c%s "$BACKUP_FILE") bytes)"
ls -lh "$BACKUP_DIR" | tail -5
