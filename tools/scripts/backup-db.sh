#!/bin/bash
# ===========================================
# Daily PostgreSQL backup script
# ===========================================
# Dumps the database and uploads to S3.
#
# Setup:
#   1. Install AWS CLI: brew install awscli
#   2. Configure: aws configure (add your S3 access key)
#   3. Create an S3 bucket for backups
#   4. Add to crontab: crontab -e
#      0 3 * * * /path/to/life-story/tools/scripts/backup-db.sh
#
# Required env vars (set in .env or export before running):
#   DATABASE_URL    - PostgreSQL connection string
#   S3_BACKUP_BUCKET - S3 bucket name (e.g. easymemoir-backups)
#
# Without S3, backups are saved locally to ./backups/
# ===========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^\s*$' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="easymemoir_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "Starting database backup..."

# Dump and compress
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$FILEPATH"

FILESIZE=$(du -h "$FILEPATH" | cut -f1)
echo "Backup created: $FILENAME ($FILESIZE)"

# Upload to S3 if bucket is configured
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "Uploading to S3..."
  aws s3 cp "$FILEPATH" "s3://$S3_BACKUP_BUCKET/daily/$FILENAME" --quiet
  echo "Uploaded to s3://$S3_BACKUP_BUCKET/daily/$FILENAME"

  # Delete local copy after successful upload
  rm "$FILEPATH"
  echo "Local copy removed"

  # Clean up old backups (keep last 30 days)
  echo "Cleaning up backups older than 30 days..."
  CUTOFF=$(date -v-30d +%Y%m%d 2>/dev/null || date -d '30 days ago' +%Y%m%d)
  aws s3 ls "s3://$S3_BACKUP_BUCKET/daily/" | while read -r line; do
    FILE=$(echo "$line" | awk '{print $4}')
    FILE_DATE=$(echo "$FILE" | grep -o '[0-9]\{8\}' | head -1)
    if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF" ]; then
      aws s3 rm "s3://$S3_BACKUP_BUCKET/daily/$FILE" --quiet
      echo "Deleted old backup: $FILE"
    fi
  done
else
  echo "S3_BACKUP_BUCKET not set — backup saved locally at $FILEPATH"

  # Clean up local backups older than 7 days
  find "$BACKUP_DIR" -name "easymemoir_*.sql.gz" -mtime +7 -delete 2>/dev/null
  echo "Cleaned up local backups older than 7 days"
fi

echo "Backup complete!"
