# Easy Memoir data migration staging contract

This directory maps the application's PostgreSQL migrations to **48 D1 tables and 432 columns**. It is a staging contract, not a completed live migration or a PostgreSQL query adapter. Existing repositories must be ported explicitly before D1 can serve the paid application.

`mapping.json` contains every column's source type, destination kind, nullability, default, primary/unique key and foreign-key action. `schema.sql` is generated from that reviewed mapping. `compile-schema.mjs` recognises the audited repository grammar and refuses unsupported declarations. The eight SQL/JavaScript migration files are fingerprinted; exporter/importer refuse stale generated files. The old `services/api/db/schema.sql` is an unrelated single-user SQLite schema and is deliberately excluded.

## Commands

Run from the repository root with Node 22.15 or newer (local verification uses experimental `node:sqlite`). These tools never write to a remote database.

```powershell
node cloudflare/db/compile-schema.mjs
node --test cloudflare/db/data.test.mjs
# Set DATABASE_URL securely in the process environment, not CLI arguments.
node tools/scripts/cloudflare-data.mjs audit C:/secure-migration/source-audit.json
node tools/scripts/cloudflare-data.mjs export C:/secure-migration/new-snapshot
node tools/scripts/cloudflare-data.mjs build-import C:/secure-migration/new-snapshot C:/secure-migration/new-import.sql
node tools/scripts/cloudflare-data.mjs verify-local C:/secure-migration/new-snapshot C:/secure-migration/new-import.sql
# For content exceeding SQL-literal statement limits:
node tools/scripts/cloudflare-bound-data.mjs build C:/secure-migration/new-snapshot C:/secure-migration/new-bound-artifact
node tools/scripts/cloudflare-bound-data.mjs verify-local C:/secure-migration/new-bound-artifact
```

Generation and test commands are offline. `audit` and `export` use a read-only repeatable-read PostgreSQL transaction. Audit checks all public application columns, source types, nullability, primary/unique/foreign/check constraints, and unique indexes. Unknown/missing fields or constraints stop export. Non-public schemas (including `pgboss`) are inventoried and reported separately; their data is **not** included, and a snapshot with external tables is explicitly marked `externalDataPreserved: false`. Preserve those schemas separately with a native PostgreSQL backup before declaring full migration. If the optional `pgmigrations` ledger exists, it is archived verbatim separately; its ID/name/run-time data is not executed as D1 migration history.

Export files and generated SQL contain personal data, password hashes, token hashes and payment records. Store them outside the checkout in a protected directory. File mode requests `0600`; on Windows, configure the directory's ACL because POSIX permissions do not guarantee access control there. Failed export directories remain for diagnosis; they have no completed manifest and must not be imported.

## Preservation and deliberate limits

- IDs and FK actions are retained. All rows are inserted explicitly. No `REPLACE`, `IGNORE`, deletion, reseeding, or automatic correction is used. SQLite foreign-key enforcement, integrity, per-table counts and SHA-256 hashes must pass the local round trip. Source sequence high-water marks are retained even when the highest previous row was deleted. Freeze writes before the final snapshot: sequences are not MVCC snapshots, and export alone does not capture later writes.
- PostgreSQL JSONB is cast to text by PostgreSQL, never reserialised through JavaScript. Large JSON numbers therefore retain their exact source text. D1 stores validated JSON text; the application must use JSON1 deliberately and decode API responses explicitly.
- Boolean values become `0`/`1` with checks, retaining nullable values. D1 API code must decode them to booleans.
- Text arrays become JSON arrays, retaining NULL entries. Multidimensional arrays or non-default lower bounds are refused because JSON would otherwise lose their PostgreSQL semantics.
- `TIMESTAMP` retains wall-clock text, including up to six fractional digits. `TIMESTAMPTZ` is exported in UTC with `+00`, preserving the instant and microseconds. Original time-zone labels were never stored by PostgreSQL. Infinity, BC and noncanonical dates fail. D1 repositories must implement comparisons and date arithmetic explicitly; SQLite has no PostgreSQL `INTERVAL` type.
- `DECIMAL(3,2)` becomes text to avoid floating-point loss; its precision/scale is checked. D1 arithmetic and API numeric decoding need an explicit decimal policy. VARCHAR lengths and int4 bounds are validated during export and enforced with D1 CHECK constraints; D1 does not reproduce PostgreSQL casting behaviour. Repository validation remains required.
- SQL import refuses any row whose generated INSERT exceeds D1's 100,000-byte statement limit. Content is never shortened. `cloudflare-bound-data.mjs` produces a reviewed offline bound-parameter artifact for larger rows: short INSERT statements and separate typed parameter arrays. It checks D1's 100-parameter/100KB SQL limits and refuses strings above 2,000,000 UTF-8 bytes or combined rows above 2,000,000 bytes including a conservative record-header allowance. Values close to the limit may be refused conservatively. No data is truncated or split between invented fields.
- An import contains schema creation and must target a new empty staging D1 database. It deliberately fails against existing application tables. Local verification uses one transaction and validates full relational integrity. Live Wrangler import behaviour, live content verification and staging restoration must still be tested before traffic is moved.

## Source inconsistencies requiring review

The SQL and JavaScript migration systems use separate ledgers. `001_baseline.js` is a no-op; `003_add_admin_column.js` repeats the guarded admin-column addition; `002_add_indexes.js` overlaps baseline indexes. SQL `002`, `003`, `004` and the performance-index migration are included. Five index names have different definitions in successive sources (`IF NOT EXISTS` makes the first existing definition win); `mapping.json.indexConflicts` records each retained/ignored definition for review. Real production index inventory is included in the audit report.

`services/api/db/columns.js` has stale column sets for prompt library, daily prompts, collection items, family prompts and memory circles. These do not match the SQL baseline and cannot define the migration schema. Production schema audit must resolve any actual drift rather than inventing missing data. Payment-audit history, soft-deleted users, token blacklist/invalidation, cron health and SQL migration history are preserved as data.

PostgreSQL-specific `pg-boss`, advisory locks, SQL array/JSON concatenation, interval math, full transactions, and query semantics require native application ports; stored-data conversion cannot make those features work on D1.

## Bound-artifact execution and recovery semantics

The artifact contains `schema.sql`, `operations.ndjson` (explicit reviewed INSERT SQL plus typed parameters), and a completion manifest written last. Counts/content hashes from the source snapshot, operation hashes, contract fingerprints and source ID sequence high-water marks are retained. Failed builds leave a diagnostic directory without a completion manifest; it is not importable. Existing artifact directories are never overwritten. Original source snapshots, optional legacy migration-ledger archives and native PostgreSQL infrastructure backups must also be retained; this artifact is for application data only.

`verify-local` executes a fresh SQLite database in one transaction, uses bound values, checks every operation against the authoritative column mapping, restores sequence high-water marks and verifies all row hashes/counts, foreign keys and integrity before committing. Failure rolls the transaction back. Verification is **not resumable** and deliberately starts with a new empty database every time; rerunning offline verification does not touch any staging or production database.

This is an offline artifact and verifier, **not a remote D1 executor**. An eventual remote importer must preflight the whole artifact, use a fresh empty staging database, implement D1 atomic batch/foreign-key semantics and limits, and perform remote count/content/sequence verification before cutover. Splitting into arbitrary batches is not automatically equivalent to the local atomic transaction. There is no resume checkpoint, INSERT IGNORE, upsert or partial-success claim. A failed future remote staging import must be treated as incomplete and rebuilt with an explicit staging reset strategy; these tools never delete remote data.

References: [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/), [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
