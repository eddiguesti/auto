#!/usr/bin/env bash
# Create a PostgreSQL custom-format archive, verify it, and optionally copy it
# to Cloudflare R2 through the S3-compatible API.

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

: "${DATABASE_URL:?DATABASE_URL must be set by the runtime or secret store}"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
BACKUP_BUCKET="${R2_BACKUP_BUCKET:-${S3_BACKUP_BUCKET:-}}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="easymemoir_${TIMESTAMP}.dump"
FILEPATH="$BACKUP_DIR/$FILENAME"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$FILEPATH.tmp"' EXIT

echo "Creating PostgreSQL archive $FILENAME"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$FILEPATH.tmp"
mv "$FILEPATH.tmp" "$FILEPATH"

echo "Verifying archive catalog"
pg_restore --list "$FILEPATH" >/dev/null
sha256sum "$FILEPATH" >"$FILEPATH.sha256"

if [ -n "${RESTORE_VERIFY_DATABASE_URL:-}" ]; then
  echo "Running destructive restore verification against the dedicated verification database"
  pg_restore \
    --dbname="$RESTORE_VERIFY_DATABASE_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    "$FILEPATH"
  psql "$RESTORE_VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "SELECT COUNT(*) FROM schema_migrations" >/dev/null
fi

if [ -n "$BACKUP_BUCKET" ]; then
  : "${R2_ENDPOINT:?R2_ENDPOINT is required when a backup bucket is configured}"
  echo "Uploading verified archive to R2"
  aws s3 cp "$FILEPATH" "s3://$BACKUP_BUCKET/daily/$FILENAME" \
    --endpoint-url "$R2_ENDPOINT" \
    --only-show-errors
  aws s3 cp "$FILEPATH.sha256" "s3://$BACKUP_BUCKET/daily/$FILENAME.sha256" \
    --endpoint-url "$R2_ENDPOINT" \
    --only-show-errors
else
  echo "No backup bucket configured; retained $FILEPATH locally"
fi

find "$BACKUP_DIR" -name 'easymemoir_*.dump' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'easymemoir_*.dump.sha256' -mtime "+$RETENTION_DAYS" -delete
echo "Backup verified successfully: $FILEPATH"
