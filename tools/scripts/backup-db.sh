#!/usr/bin/env bash
# Create a PostgreSQL snapshot dump and matching SHA256/table-count manifest.
# Optional BACKUP_VERIFY_DATABASE_URL runs an isolated restore before S3 upload.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/create-backup.js"
