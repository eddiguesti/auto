# Migration inventory and preflight

This directory records migration scope and checks deployment prerequisites. It does not deploy, import, publish, alter DNS, send messages, read customer rows, or declare the Railway migration complete. `productionReady` remains false. A local implementation is recorded as `implemented-staging`; deployed behavior and production acceptance remain separate requirements.

The selected release is a **fresh launch** on the new easy Memoir account. The user requested starting from scratch; no old accounts or memories are imported, and source resources are retained. The historical import/cutover checklist below remains a separate workflow. Current staging uses real D1 and all frozen native migrations; initialization and static catalog receipts live outside the checkout. R2/Workers Paid activation and hosted acceptance remain pending until independently verified.

## Source inventory

```powershell
node cloudflare/readiness/inventory.mjs --write
node --test cloudflare/readiness/preflight.test.mjs
```

`route-parity.json` contains canonical source HTTP routes, actual mounted aliases, source filenames/lines, mount middleware and handler references. It includes health and Swagger JSON routes, the Swagger middleware prefix, two source WebSocket paths, the five schedule definitions with UTC/Europe-London timezone distinctions, the three queue names, environment variable **names**, and reviewed provider integration requirements. Source files are fingerprinted. No application modules execute during extraction, so inventory does not create database connections or contact providers.

`native-evidence.json` is a reviewed list of exact native methods/paths and code/test evidence. Update it when a port and its behavioral verification are complete, then regenerate the inventory. A route appearing in this file does not mean its side effects, provider lifecycle or deployed behavior are accepted. In particular, the story outbox is stored intent; its existence does not implement notifications, image generation or a Queue consumer.

Frontend references are parsed from real source syntax rather than comments. Direct fetch/API client calls record the statically available HTTP method. Literal paths are compared against the mounted source methods and route parameters; WebSocket paths are tracked separately. Dynamic references, paths held in variables, indirect wrappers, conditional routes, implicit Express HEAD requests and payload/response schemas require runtime contract review. The inventory is not a symbolic program interpreter or a guarantee that every dormant client path is used. Static mismatches are explicit review items. Retire an endpoint or feature only with an explicit product decision; lack of migration support is not retirement.

## Read-only preflight

```powershell
# Offline checks; exit 1 is expected while destination state is unverified.
node cloudflare/readiness/preflight.mjs
# Optional local database: opened read-only; only schema/integrity metadata is read.
node cloudflare/readiness/preflight.mjs --local-schema C:/secure-migration/staging.sqlite
# After configuring an isolated real staging DB and staging Worker:
# Supply CLOUDFLARE_API_TOKEN securely in this process environment, never as a CLI argument.
node cloudflare/readiness/preflight.mjs --remote --config wrangler.api-staging.jsonc
# Displays full-migration prerequisites; deliberately fails until real acceptance exists.
node cloudflare/readiness/preflight.mjs --profile cutover
```

Offline checks verify the reviewed Cloudflare account, private staging configuration, native feature gate, UTC timestamp policy, actual D1 binding, staging resource name, absence of the local UUID sentinel, secrets outside plain vars, generated schema freshness, and source inventory freshness. Merely setting UTC locally does not establish the real source timestamp interpretation. Secret existence is `unverified` offline; local environment values cannot attest deployed secrets.

The selected workers.dev environment explicitly uses [account-budget authentication](../AUTH_BUDGET.md), so it does not require a signed IP identity service. It requires authoritative D1 budgets, the reviewed bcrypt CPU allowance, private `MEDIA`, provider secrets and an explicit HTTPS application origin. A local 5,000-ms budget does not establish a paid plan or hosted bcrypt profiling. The alternative signed-ingress mode still requires a verified custom-domain/WAF policy and matching ingress secrets; local flags do not establish that policy.

The optional remote mode calls only Cloudflare metadata endpoints and one fixed SELECT on `sqlite_master`. It verifies D1 name/UUID/EU jurisdiction, complete table/index/trigger/view definitions, the deployed Worker's DB, identity-service and media bindings, staging/timezone variables, and the names of required secrets. It does not fetch application table contents or issue mutation SQL. Only an isolated staging target in the reviewed account is accepted. Provider response bodies, secret text, schema SQL and environment values never appear in the report. A missing Worker, missing permissions, failed query, drifted schema, missing secret or malformed response fails closed. Requests have a 15-second timeout and refuse redirects. Use minimally scoped Cloudflare credentials appropriate for D1 and Worker metadata; this tool does not change credential permissions.

Schema definitions are compared conservatively against a fresh local SQLite oracle built from `cloudflare/db/schema.sql` and every native API SQL migration. Internal SQLite/Cloudflare objects and the D1 migration ledger are excluded. Changed constraints, indexes, FK actions, triggers or views are detected even when column names are unchanged. Cosmetic SQL differences may require review and produce a failure; no broad SQL rewriting hides drift. The local option also reports only aggregate foreign-key/integrity failure counts. Remote data counts, content hashes, sequences, media, source timezone, live route behavior and provider correctness remain independent acceptance gates.

The report sets `preflightPassed` only when all requested checks pass; `unverified` counts as incomplete. Hosted CPU and any selected signed-ingress/WAF proof remain unverified here, so the report cannot authorize auth deployment or production traffic. `productionReady` remains false. `--profile cutover` is an informative blocked gate, because this configuration and tool cannot establish the complete migration evidence. Do not use it to automate DNS or Railway deletion.

Remote interfaces were checked against the official [D1 metadata API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/), [D1 query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [Worker settings API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/settings/methods/get/), and [Worker secret-name listing](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/list/). The source extractor uses the repository's `espree` dependency; preflight uses Node 22.15+ `node:sqlite` for an in-memory schema oracle.

## Cutover checklist

`cutover-gates.json` records the required evidence without inventing live completion. Work through the gates in order:

1. Audit and preserve Railway PostgreSQL, source settings, infrastructure schemas and source media. Verify native backups can be restored.
2. Export and validate a consistent snapshot. Import to fresh isolated D1/R2 staging, then verify all row/object content and sequence high-water marks remotely.
3. Complete route/client/provider contracts, identity/account flows, payment/refund/subscription lifecycle, jobs, schedules and realtime sessions. Exercise concurrent writes, duplicate deliveries, ownership denial, revocation and provider outages.
4. Accept the deployed staging Worker and all bindings. Rehearse restoration and a rollback that accounts for writes, queued work and provider callbacks.
5. Freeze source writes, perform the final reviewed transfer, verify again, then coordinate the accepted frontend binding, DNS and provider callback switch. Keep source service and backups throughout the rollback window.
6. Retire Railway only after sustained destination acceptance, complete preservation evidence and explicit retirement authorization.

No real source snapshot, private media transfer, live route acceptance or traffic switch is established by these files. The separately provisioned EU migration database is a staging resource; existence alone is not an imported or production database.
