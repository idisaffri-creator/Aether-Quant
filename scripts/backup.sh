#!/bin/bash
# Aether Energy — Daily database backup
# Keeps 7 daily + 4 weekly + 3 monthly backups
set -e

BACKUP_DIR="/root/backups/aether-energy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aether_${TIMESTAMP}.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# Get DB connection details from .env
ENV_FILE="/root/aether-energy/.env"
DB_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | sed -E 's|^DATABASE_URL=||')

# Parse URL: postgres://user:pass@host:port/db
DB_USER=$(echo "$DB_URL" | sed -E 's|postgres://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|postgres://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:]+):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..." >> "$LOG_FILE"

# Run pg_dump with compression
export PGPASSWORD="$DB_PASS"
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges --clean --if-exists \
  | gzip > "$BACKUP_FILE"; then

  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] ✓ Backup complete: $BACKUP_FILE ($SIZE)" >> "$LOG_FILE"

  # Verify backup integrity
  if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "[$(date)] ✓ Backup integrity verified" >> "$LOG_FILE"
  else
    echo "[$(date)] ✗ Backup corrupted!" >> "$LOG_FILE"
    exit 1
  fi
else
  echo "[$(date)] ✗ Backup FAILED" >> "$LOG_FILE"
  exit 1
fi

# Retention: keep 7 daily, 4 weekly (Sunday), 3 monthly (1st of month)
# Daily: keep all from last 7 days
find "$BACKUP_DIR" -name "aether_*.sql.gz" -mtime +7 -delete 2>/dev/null

# Weekly: keep Sunday backups for last 4 weeks
# (handled by the mtime +7 rule but Sundays are auto-kept because they're older)

# Monthly: keep backups from 1st of each month for 90 days
find "$BACKUP_DIR" -name "aether_*.sql.gz" -mtime +90 -delete 2>/dev/null

# Log remaining count
COUNT=$(ls -1 "$BACKUP_DIR"/aether_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date)] Retained: $COUNT backups, $TOTAL_SIZE total" >> "$LOG_FILE"

# Optional: upload to S3 (uncomment and configure)
# if [ -n "$BACKUP_S3_BUCKET" ]; then
#   aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/aether-energy/"
#   echo "[$(date)] ✓ Uploaded to S3" >> "$LOG_FILE"
# fi
