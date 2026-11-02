# Easy Memoir data migration staging contract

This directory maps the application's PostgreSQL migrations to **56 D1 tables and 483 columns**. It is a staging contract, not a completed live migration or a PostgreSQL query adapter. Existing repositories must be ported explicitly before D1 can serve the paid application.

`mapping.json` contains every column's source type, destination kind, nullability, default, primary/unique key and foreign-key action. `schema.sql` is generated from that reviewed mapping. `compile-schema.mjs` recognises the audited repository grammar and refuses unsupported declarations. The twelve SQL/JavaScript migration files are fingerprinted; exporter/importer refuse stale generated files. The old `services/api/db/schema.sql` is an unrelated single-user SQLite schema and is deliberately excluded.

## Commands

Run from the repository root with Node 22.15 or newer (local verification uses experimental `node:sqlite`). Audit/export/build/local-verification commands do not write to a remote database. The separately named remote importer below writes only to an explicitly configured empty staging D1 database.

```powershell
node cloudflare/db/compile-schema.mjs
node --test cloudflare/db/data.test.mjs
node --test cloudflare/db/remote-data.test.mjs
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
- An import contains schema creation and must target a new empty staging D1 database. It deliberately fails against existing application tables. Local verification uses one transaction and validates full relational integrity. The remote executor uses multiple atomic batches, so a failed remote import can leave earlier batches committed. Hosted API acceptance and staging restoration must still be tested before traffic is moved.

## Source inconsistencies requiring review

The SQL and JavaScript migration systems use separate ledgers. `001_baseline.js` is a no-op; `003_add_admin_column.js` repeats the guarded admin-column addition; `002_add_indexes.js` overlaps baseline indexes. SQL `002`, `003`, `004` and the performance-index migration are included. Five index names have different definitions in successive sources (`IF NOT EXISTS` makes the first existing definition win); `mapping.json.indexConflicts` records each retained/ignored definition for review. Real production index inventory is included in the audit report.

`services/api/db/columns.js` has stale column sets for prompt library, daily prompts, collection items, family prompts and memory circles. These do not match the SQL baseline and cannot define the migration schema. Production schema audit must resolve any actual drift rather than inventing missing data. Payment-audit history, soft-deleted users, token blacklist/invalidation, cron health and SQL migration history are preserved as data.

PostgreSQL-specific `pg-boss`, advisory locks, SQL array/JSON concatenation, interval math, full transactions, and query semantics require native application ports; stored-data conversion cannot make those features work on D1.

## Bound-artifact execution and recovery semantics

The artifact contains `schema.sql`, `operations.ndjson` (explicit reviewed INSERT SQL plus typed parameters), and a completion manifest written last. Counts/content hashes from the source snapshot, operation hashes, contract fingerprints and source ID sequence high-water marks are retained. Failed builds leave a diagnostic directory without a completion manifest; it is not importable. Existing artifact directories are never overwritten. Original source snapshots, optional legacy migration-ledger archives and native PostgreSQL infrastructure backups must also be retained; this artifact is for application data only.

`verify-local` executes a fresh SQLite database in one transaction, uses bound values, checks every operation against the authoritative column mapping, restores sequence high-water marks and verifies all row hashes/counts, foreign keys and integrity before committing. Failure rolls the transaction back. Verification is **not resumable** and deliberately starts with a new empty database every time; rerunning offline verification does not touch any staging or production database.

The bound builder and `verify-local` remain offline. `tools/scripts/cloudflare-remote-data.mjs` is a separate staging executor for these bound artifacts. It does not accept arbitrary SQL files, resume a failed import, or apply native API migrations. There is no INSERT IGNORE, upsert, database reset or partial-success claim. These tools never delete remote data.

## Fresh empty Cloudflare database

When starting from scratch is explicitly intended, no PostgreSQL snapshot is needed. Provision a new, unbound staging database in the intended Cloudflare account and prepare this protected target JSON outside the checkout:

```json
{
  "formatVersion": 1,
  "environment": "staging",
  "accountId": "1234567890abcdef1234567890abcdef",
  "databaseId": "12345678-1234-1234-1234-123456789abc",
  "databaseName": "easy-memoir-staging-20261102",
  "contractHash": "ACTUAL_64_CHARACTER_CONTRACT_HASH_FROM_REVIEWED_MAPPING_AND_SCHEMA",
  "exclusiveAccess": true
}
```

Use the `contractHash` from `loadContract()`; it fingerprints the current reviewed mapping/schema and all source migrations must still reproduce that contract. The initializer accepts exactly these seven fields, with the same account/ID/staging-name/exclusive-access guards below. It does not accept an artifact fingerprint because it generates its own zero-row artifact from the reviewed schema.

After connecting the intended Cloudflare account (for example using the named Wrangler profile `easy-memoir`), provide a valid token securely in `CLOUDFLARE_API_TOKEN` in the process environment and run:

```powershell
node tools/scripts/cloudflare-init-staging.mjs C:/secure-migration/fresh-target.json C:/secure-migration/fresh-schema-receipt.ndjson
```

This creates all 56 reviewed application tables and indexes, initializes serial high-water marks to zero, and verifies remotely that the application schema is exact and every application table is empty. It reuses the importer lifecycle below, including `__easy_memoir_import`, atomic batches, incomplete failure markers, protected receipts, read-back hashes, foreign-key checks and `quick_check`. Any existing application schema or previous initialization/import ledger causes refusal. It never clears an existing database. Native API-only migrations under `cloudflare/api/migrations/` remain a separate step after this foundation; initialization alone does not make the application ready to serve traffic.

## Remote staging import

Create a new, unbound staging D1 database using the deployment account's normal provisioning workflow. Keep application writers, queue consumers and schedules disconnected throughout import and verification. The importer requires an explicit assertion of exclusive staging access; a configuration flag cannot prevent another credential holder from writing concurrently.

Review the artifact, its source snapshot, current mapping/schema and the intended Cloudflare account/database before preparing a protected target JSON file outside the checkout. It must contain exactly these fields (substitute the reviewed real IDs and fingerprints):

```json
{
  "formatVersion": 1,
  "environment": "staging",
  "accountId": "1234567890abcdef1234567890abcdef",
  "databaseId": "12345678-1234-1234-1234-123456789abc",
  "databaseName": "easy-memoir-import-staging-20261102",
  "artifactManifestSha256": "SHA256_OF_THE_EXACT_ARTIFACT_MANIFEST_FILE",
  "contractHash": "CONTRACT_HASH_FROM_THE_REVIEWED_ARTIFACT_MANIFEST",
  "exclusiveAccess": true
}
```

The two fingerprint strings must be actual 64-character lowercase SHA-256 values. `artifactManifestSha256` hashes the exact `manifest.json` bytes, including its final newline; the manifest in turn pins schema, operations and every source table's counts/content/sequence. `contractHash` must also match the freshly recompiled local reviewed contract. Database names must include a separate `staging` component and may not include a `prod`/`production` component. Sentinel database IDs are refused. Credentials do not belong in this file.

Set `CLOUDFLARE_API_TOKEN` securely in the process environment using an account-scoped token with the needed D1 permissions. No token argument, `.env` auto-loading, shell substitution, or persisted secret is required. Then run:

```powershell
node tools/scripts/cloudflare-remote-data.mjs import C:/secure-migration/new-bound-artifact C:/secure-migration/staging-target.json C:/secure-migration/new-import-receipt.ndjson
```

The receipt path must not already exist. The executor:

1. Copies all three artifact files into a private temporary directory and verifies the complete copy offline, including exact reviewed INSERT shapes, mapped values, hashes/counts, constraints, foreign keys, integrity and source ID high-water marks. It sizes the entire remote execution plan before making any API call. Original artifact changes after this copy cannot alter the import.
2. Retrieves database metadata from the fixed official Cloudflare API origin and requires both ID and name to match the configured account/database target. It inspects `sqlite_schema`, allowing only SQLite internals, D1's `_cf_METADATA`, and the exact documented `_cf_KV` table (`key TEXT PRIMARY KEY, value BLOB`, `WITHOUT ROWID`). Other `_cf_*` names and different definitions using `_cf_KV` are refused. Existing application tables, D1 migration ledgers, import ledgers, views, indexes or triggers cause refusal. Emptiness is asserted again inside the first atomic batch to catch a concurrent creator.
3. Creates `__easy_memoir_import` with an `importing` marker, creates the reviewed schema/indexes, and inserts parent tables before child tables. Foreign-key enforcement stays enabled. Cyclic/unknown dependency graphs are refused in preflight rather than deferring foreign keys across commits. The current reviewed graph is acyclic.
4. Uses the official REST `query` endpoint's `batch` request shape. Requests are limited conservatively to 100 statements and 4,000,000 encoded JSON bytes, with each SQL statement checked against 100,000 bytes and 100 bound parameters. Strings always remain bound parameters; already-validated integers/null become typed SQL literals because the REST contract documents string parameters. Oversized individual requests are refused before any network activity. The same importer limits need not be Cloudflare service maximums.
5. Reads every remote application row back in primary-key order with bounded keyset pages. Schema definitions, per-table counts/content hashes, all sequence high-water marks, foreign keys and D1's `PRAGMA quick_check` must pass before the ledger and receipt can become `complete`. D1 does not authorize the offline verifier's SQLite `integrity_check`; the remote result names the supported check explicitly as `quickCheck`. This marks only the application-data import complete; media, providers, pg-boss archives and application parity are separate cutover gates. `infrastructurePreserved: false` remains visible when the source export did not preserve external schemas.

Each D1 batch is atomic; the entire multi-batch import is **not one transaction**. Network timeouts and errors are never automatically retried because a write may already have committed. A failure marks this import's remote ledger `incomplete` when reachable and appends an `incomplete` local receipt with a fixed error code; failure to reach the ledger is recorded as `unknown-incomplete`. The journal is created exclusively with mode `0600` and synced at state transitions. A process crash leaving `importing`/`verifying`, an absent final receipt, or an uncertain completion must be treated as incomplete. Provider error bodies, SQL parameters and credential values are not logged.

Retain failed targets for diagnosis and explicitly provision another empty staging database for a new attempt. This command has no destructive cleanup, reset or resume operation. It refuses to reuse an incomplete target. Temporary copies/plans are removed on normal success/failure; an OS/process crash may leave a private `memoir-d1-remote-*` directory under the system temporary directory containing sensitive data, which must be handled as a protected migration artifact.

Tests cover fake transport failures, concurrent creation, tampering, pagination, rollback, incomplete/uncertain imports and verification rejection. Actual local Miniflare/workerd D1 execution covers all reviewed tables and bound content exceeding 100KB, plus atomic batch rollback. This is **local** runtime/API-shape evidence, not proof of hosted REST acceptance or full-scale production import performance. No real remote database was changed by these tests. Before cutover, exercise this exact command against a disposable hosted staging database and independently verify its completed data and recovery procedure.

References: [D1 REST batch queries](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [D1 database metadata](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/), [D1 batch transaction semantics](https://developers.cloudflare.com/d1/worker-api/d1-database/), [D1 supported PRAGMAs](https://developers.cloudflare.com/d1/sql-api/sql-statements/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/), [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
