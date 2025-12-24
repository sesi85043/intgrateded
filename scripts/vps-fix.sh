#!/usr/bin/env bash
set -euo pipefail

# vps-fix.sh
# Safely apply a set of emergency fixes on the VPS (DB backup, schema fixes,
# Chatwoot URL normalization, bundled migrations, restart app, and tail logs).
# Usage: sudo bash scripts/vps-fix.sh

BACKUP_DIR=/root/adminhub/backups
TIMESTAMP=$(date +%s)

echo "[vps-fix] Starting emergency fixes at $(date -u)"

if ! command -v docker >/dev/null 2>&1; then
  echo "[vps-fix] Docker not found. Aborting." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[vps-fix] Backing up database to $BACKUP_DIR/db-backup-$TIMESTAMP.sql"
docker exec -t adminhub-postgres pg_dump -U postgres -d postgres > "$BACKUP_DIR/db-backup-$TIMESTAMP.sql"
echo "[vps-fix] Backup complete"

echo "[vps-fix] Applying DB fixes: ensure parent_email exists"
docker exec -it adminhub-postgres psql -U postgres -d postgres -c "ALTER TABLE department_email_settings ADD COLUMN IF NOT EXISTS parent_email varchar(255);"

echo "[vps-fix] Normalizing Chatwoot base_url values (remove trailing slashes)"
docker exec -it adminhub-postgres psql -U postgres -d postgres -c "UPDATE service_configs SET base_url = regexp_replace(base_url, '/+$', '') WHERE service_name = 'chatwoot' AND base_url IS NOT NULL;"

echo "[vps-fix] Running bundled migrations via app container"
docker compose exec app node dist/run-migration.mjs

echo "[vps-fix] Restarting app container"
docker compose restart app

echo "[vps-fix] Tailing app logs (showing chatwoot & provisioning lines). Press Ctrl+C to exit." 
docker compose logs -f app --tail 200 | grep -Ei "chatwoot|provisioning" || true

echo "[vps-fix] Done at $(date -u)"
