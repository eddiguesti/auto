# Backup creation and restore verification

`npm run backup` creates a compressed PostgreSQL dump and a companion `.manifest.json` containing the SHA256 checksum and row count of every application table. Both come from the same database snapshot. Set `DATABASE_URL` and optionally `BACKUP_DIR`; PostgreSQL `pg_dump` must be on `PATH` (or set `PG_DUMP_PATH`). `.env` is read as data, without shell evaluation.

With `S3_BACKUP_BUCKET`, the dump and manifest upload together. Local copies remain available after an upload or verification failure. Apply a documented retention policy to the local directory and S3 bucket rather than deleting the only verified copy automatically.

Create a separate empty PostgreSQL database whose name contains `restore_verify`. Verification refuses a database with existing tables/views/sequences and refuses the source database name, even across different hosts. It never cleans or overwrites a target.

Run the restore rehearsal with explicit paths:

```sh
BACKUP_FILE=/absolute/path/easymemoir_TIMESTAMP.sql.gz \
BACKUP_MANIFEST_FILE=/absolute/path/easymemoir_TIMESTAMP.sql.gz.manifest.json \
BACKUP_VERIFY_DATABASE_URL=postgresql://localhost/easy_memoir_restore_verify_20261102 \
npm run backup:verify
```

`psql` must be on `PATH` (or set `PSQL_PATH`). The verifier checks the checksum, required table inventory, safe dump format, an empty target, a successful transaction under `ON_ERROR_STOP`, restored row counts, and validated constraints. A failed check exits nonzero. The restored verification database remains available for inspection; drop it deliberately when finished. Treat backups and manifests as private customer data.

Setting `BACKUP_VERIFY_DATABASE_URL` during `npm run backup` performs this rehearsal before uploading. Use a new empty verification database for each run. Never point this setting at production.
