/** Read-only deployment preflight. No arbitrary SQL, deploy, import or customer-row reads. */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { compile } from '../db/compile-schema.mjs'
import { buildInventory, root } from './inventory.mjs'

const ACCOUNT = 'df3d63daad6e36a66171d8ae6b368da7'
const SENTINEL = /^0{8}-0{4}-0{4}-0{4}-0{11}[01]$/
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const safeName = /^[A-Za-z_][A-Za-z0-9_-]*$/
const SECRET = /(?:SECRET|TOKEN|API_KEY|ACCESS_KEY|DATABASE_URL|REDIS_URL)$/

// A small JSONC reader: comments and trailing commas outside strings only.
export function parseJsonc(text) {
  let cleaned = '',
    quoted = false,
    escaped = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      cleaned += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
    } else if (char === '"') {
      quoted = true
      cleaned += char
    } else if (char === '/' && text[i + 1] === '/') {
      while (i < text.length && !['\n', '\r'].includes(text[i])) i++
      cleaned += '\n'
    } else if (char === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      if (i >= text.length) throw new Error('Invalid JSONC')
      i++
      cleaned += ' '
    } else cleaned += char
  }
  let result = ''
  quoted = false
  escaped = false
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]
    if (!quoted && char === ',') {
      let next = i + 1
      while (/\s/.test(cleaned[next] || '') && next < cleaned.length) next++
      if (['}', ']'].includes(cleaned[next])) continue
    }
    result += char
    if (quoted && escaped) escaped = false
    else if (quoted && char === '\\') escaped = true
    else if (char === '"') quoted = !quoted
  }
  return JSON.parse(result)
}

function check(id, ok, detail) {
  return { id, status: ok ? 'pass' : 'fail', detail }
}

export function inspectConfig(config, { profile = 'staging', secretNames = null } = {}) {
  const db = config.d1_databases?.find(item => item.binding === 'DB')
  const checks = [
    check(
      'account',
      config.account_id === ACCOUNT,
      'Configuration must target the reviewed Easy Memoir account.'
    ),
    check(
      'worker-name',
      typeof config.name === 'string' && safeName.test(config.name) && /staging/.test(config.name),
      'This tool currently accepts only an isolated staging Worker.'
    ),
    check(
      'entrypoint',
      config.main === 'cloudflare/api-staging.js',
      'Expected native staging entrypoint.'
    ),
    check(
      'private-staging',
      config.workers_dev === false &&
        config.preview_urls === false &&
        Array.isArray(config.routes) &&
        config.routes.length === 0,
      'Staging must have no public routes, workers.dev endpoint or preview URLs.'
    ),
    check(
      'native-stage',
      config.vars?.NATIVE_API_STAGE === 'local-d1-slice',
      'Staging feature gate must match the native runtime.'
    ),
    check(
      'timestamp-policy',
      config.vars?.SOURCE_TIMESTAMP_TIMEZONE === 'UTC',
      'Runtime currently accepts UTC source interpretation only; source confirmation remains a separate gate.'
    ),
    check('d1-binding', !!db, 'Native repositories require the DB binding.'),
    check(
      'd1-staging-name',
      typeof db?.database_name === 'string' && /staging/.test(db.database_name),
      'The DB binding must explicitly name a staging database.'
    ),
    check(
      'd1-provisioned',
      !!db && UUID.test(db.database_id || '') && !SENTINEL.test(db.database_id || ''),
      'Replace the local sentinel with a separately provisioned staging D1 database.'
    ),
    check(
      'secrets-not-vars',
      !Object.keys(config.vars || {}).some(name => SECRET.test(name)),
      'Secret values belong in Worker secrets, never vars.'
    ),
    check(
      'no-legacy-bindings',
      !config.hyperdrive?.length,
      'A full Cloudflare migration cannot depend on external PostgreSQL through Hyperdrive.'
    )
  ]
  let httpsAppUrl = false
  try {
    const app = new URL(config.vars?.APP_URL)
    httpsAppUrl = app.protocol === 'https:' && !app.username && !app.password
  } catch {
    /* Missing/invalid value is reported without disclosure. */
  }
  checks.push(
    check(
      'auth-client-service',
      config.services?.some(
        item => item.binding === 'AUTH_CLIENT_ID' && /staging/.test(item.service || '')
      ),
      'Public auth requires a private trusted AUTH_CLIENT_ID service for canonical rate-limit subjects.'
    )
  )
  checks.push(
    check(
      'auth-cpu-budget',
      Number.isInteger(config.limits?.cpu_ms) && config.limits.cpu_ms >= 5000,
      'Preserving bcrypt12 credentials requires the reviewed staging CPU budget.'
    )
  )
  checks.push({
    id: 'auth-hosted-cpu-proof',
    status: 'unverified',
    detail: 'A local CPU budget does not establish a Paid Workers plan or hosted bcrypt profiling.'
  })
  checks.push(
    check(
      'email-origin',
      httpsAppUrl,
      'Verification links require an explicit HTTPS APP_URL without embedded credentials.'
    )
  )
  checks.push(
    check(
      'media-binding',
      config.r2_buckets?.some(item => item.binding === 'MEDIA'),
      'Implemented photo routes require a private MEDIA R2 binding and object verification.'
    )
  )
  const secrets = ['JWT_SECRET', 'GROK_API_KEY']
  if (!config.services?.some(item => item.binding === 'EMAIL_PROVIDER'))
    secrets.push('RESEND_API_KEY')
  if (profile === 'cutover') {
    checks.push(
      check(
        'queues',
        !!config.queues?.producers?.length && !!config.queues?.consumers?.length,
        'Durable generation work needs producers, consumers and tested deduplication.'
      )
    )
    checks.push(
      check(
        'scheduler',
        !!config.triggers?.crons?.length,
        'Scheduled tasks need execution claims and Europe/London DST semantics.'
      )
    )
    checks.push(
      check(
        'voice-coordinator',
        !!config.durable_objects?.bindings?.length,
        'Voice/Telnyx sessions require a durable lifecycle coordinator.'
      )
    )
    secrets.push(
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'GROK_API_KEY',
      'REPLICATE_API_TOKEN',
      'FISH_AUDIO_API_KEY',
      'RESEND_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_WEBHOOK_SECRET',
      'TELNYX_API_KEY',
      'INTERNAL_CRON_SECRET',
      'LULU_CLIENT_KEY',
      'LULU_CLIENT_SECRET'
    )
    checks.push(
      check(
        'full-cutover',
        false,
        'Cutover is blocked: deployed parity, source snapshot, media verification, provider callbacks, final write freeze and rollback evidence are not established by this tool.'
      )
    )
  }
  for (const name of new Set(secrets)) {
    checks.push(
      secretNames === null
        ? {
            id: `secret:${name}`,
            status: 'unverified',
            detail: 'Deployed secret metadata was not read.'
          }
        : check(
            `secret:${name}`,
            secretNames.includes(name),
            'Checks presence only; value correctness requires separate provider acceptance.'
          )
    )
  }
  return checks
}

export function inspectIngress(config) {
  const vars = config.vars || {}
  const configured = [
    vars.AUTH_INGRESS_MODE,
    vars.AUTH_INGRESS_HOST,
    vars.AUTH_INGRESS_RULES_VERIFIED
  ].some(Boolean)
  const enabled =
    vars.AUTH_INGRESS_MODE === 'direct-custom-domain' && vars.AUTH_INGRESS_RULES_VERIFIED === 'true'
  let hostValid = false
  try {
    const host = new URL(`https://${vars.AUTH_INGRESS_HOST}`)
    hostValid =
      host.hostname === vars.AUTH_INGRESS_HOST &&
      host.pathname === '/' &&
      !host.username &&
      !host.password &&
      !host.port
  } catch {
    /* Invalid host is reported without disclosure. */
  }
  return [
    check(
      'ingress-policy-posture',
      !configured || (enabled && hostValid),
      configured
        ? 'Configured ingress assertions require the reviewed direct custom domain policy.'
        : 'Ingress assertions remain disabled by default.'
    ),
    check(
      'ingress-auth-enabled',
      enabled && hostValid,
      'Auth cannot pass the trusted client identity boundary until the reviewed custom-domain policy is enabled.'
    ),
    {
      id: 'ingress-operational-proof',
      status: 'unverified',
      detail:
        'Local flags cannot prove WAF rules. Independently verify the routed zone blocks ALL Worker subrequests using cf.worker.upstream_zone ne "" before enabling signed IP assertions.'
    },
    {
      id: 'ingress-secret-proof',
      status: 'unverified',
      detail:
        'Separately verify AUTH_INGRESS_SECRET exists and matches in the edge Worker and private identity service; API secret metadata cannot establish this.'
    }
  ]
}

// Never select application columns. Schema SQL is held in memory and never printed.
export const SCHEMA_QUERY =
  "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type IN ('table','index','trigger','view') AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name != 'd1_migrations' ORDER BY type,name"
const normalizeSql = value => value.trim().replace(/;$/, '').replace(/\r\n/g, '\n')

export function compareSchema(expected, actual) {
  const wanted = new Map(expected.map(item => [`${item.type}:${item.name}`, item]))
  const found = new Map(actual.map(item => [`${item.type}:${item.name}`, item]))
  let missing = 0,
    changed = 0,
    unexpected = 0
  for (const [key, item] of wanted) {
    const observed = found.get(key)
    if (!observed) missing++
    else if (
      item.tbl_name !== observed.tbl_name ||
      normalizeSql(item.sql) !== normalizeSql(observed.sql)
    )
      changed++
  }
  for (const key of found.keys()) if (!wanted.has(key)) unexpected++
  return { missing, changed, unexpected, ok: missing + changed + unexpected === 0 }
}

export async function expectedSchema() {
  const schema = await readFile(path.join(root, 'cloudflare/db/schema.sql'), 'utf8')
  const migrations = (await readdir(path.join(root, 'cloudflare/api/migrations')))
    .filter(name => name.endsWith('.sql'))
    .sort()
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('PRAGMA foreign_keys=ON')
    db.exec(schema)
    for (const migration of migrations)
      db.exec(await readFile(path.join(root, 'cloudflare/api/migrations', migration), 'utf8'))
    return db.prepare(SCHEMA_QUERY).all()
  } finally {
    db.close()
  }
}

// Only fixed metadata endpoints. Provider error messages and response bodies are never returned.
export async function cloudflareRequest(endpoint, { token, fetchImpl = fetch, sql } = {}) {
  if (sql && sql !== SCHEMA_QUERY)
    throw new Error('Only the fixed schema metadata query is allowed.')
  const databaseEndpoint = new RegExp(`^accounts/${ACCOUNT}/d1/database/[a-f0-9-]{36}(?:/query)?$`)
  const workerEndpoint = new RegExp(
    `^accounts/${ACCOUNT}/workers/scripts/[A-Za-z_][A-Za-z0-9_-]*staging[A-Za-z0-9_-]*/(?:secrets|settings)$`
  )
  if (!databaseEndpoint.test(endpoint) && !workerEndpoint.test(endpoint))
    throw new Error('Only reviewed staging metadata endpoints are allowed.')
  if (endpoint.endsWith('/query') !== Boolean(sql))
    throw new Error('Only the fixed schema metadata query is allowed.')
  try {
    const response = await fetchImpl(`https://api.cloudflare.com/client/v4/${endpoint}`, {
      method: sql ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(sql ? { 'Content-Type': 'application/json' } : {})
      },
      ...(sql ? { body: JSON.stringify({ sql, params: [] }) } : {})
    })
    if (!response.ok) throw new Error('Remote check unavailable')
    const data = await response.json()
    if (data.success !== true) throw new Error('Remote check unavailable')
    if (
      sql &&
      (!Array.isArray(data.result) ||
        data.result.some(item => item.success !== true || item.meta?.rows_written > 0))
    ) {
      throw new Error('Remote check unavailable')
    }
    return data.result
  } catch {
    throw new Error(
      'Remote check unavailable; verify access and permissions without printing provider response bodies.'
    )
  }
}

export async function runPreflight({
  configPath = 'wrangler.api-staging.jsonc',
  profile = 'staging',
  remote = false,
  token = process.env.CLOUDFLARE_API_TOKEN,
  fetchImpl = fetch,
  schemaPath = null
} = {}) {
  if (!['staging', 'cutover'].includes(profile)) throw new Error('Invalid profile')
  const config = parseJsonc(await readFile(path.resolve(root, configPath), 'utf8'))
  const checks = inspectConfig(config, { profile })
  checks.push(
    ...inspectIngress(parseJsonc(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8')))
  )
  const { manifest, schema } = await compile()
  const checkedMapping = JSON.parse(
    await readFile(path.join(root, 'cloudflare/db/mapping.json'), 'utf8')
  )
  const checkedSchema = await readFile(path.join(root, 'cloudflare/db/schema.sql'), 'utf8')
  checks.push(
    check(
      'schema-freshness',
      JSON.stringify(manifest) === JSON.stringify(checkedMapping) && schema === checkedSchema,
      'Audited mapping and generated SQL must match the current source migrations.'
    )
  )
  const generated = await buildInventory()
  const recorded = JSON.parse(
    await readFile(path.join(root, 'cloudflare/readiness/route-parity.json'), 'utf8')
  )
  checks.push(
    check(
      'inventory-freshness',
      JSON.stringify(generated) === JSON.stringify(recorded),
      'Regenerate the source inventory after route/frontend changes and review native evidence.'
    )
  )
  const expected = await expectedSchema()
  if (schemaPath) {
    const db = new DatabaseSync(path.resolve(schemaPath), { readOnly: true })
    try {
      const comparison = compareSchema(expected, db.prepare(SCHEMA_QUERY).all())
      checks.push(check('local-schema', comparison.ok, comparison))
      const violations = db
        .prepare('SELECT count(*) AS failures FROM pragma_foreign_key_check')
        .get().failures
      checks.push(check('local-foreign-keys', violations === 0, { violations }))
      const failures = db
        .prepare(
          "SELECT count(*) AS failures FROM pragma_integrity_check WHERE integrity_check != 'ok'"
        )
        .get().failures
      checks.push(check('local-integrity', failures === 0, { failures }))
    } finally {
      db.close()
    }
  }
  if (remote) {
    const targetSafe = checks
      .filter(item =>
        ['account', 'worker-name', 'private-staging', 'd1-provisioned', 'd1-staging-name'].includes(
          item.id
        )
      )
      .every(item => item.status === 'pass')
    checks.push(
      check(
        'remote-target',
        targetSafe,
        'Remote reads require a reviewed, isolated staging target.'
      )
    )
    checks.push(
      check(
        'remote-credential',
        !!token,
        'Provide CLOUDFLARE_API_TOKEN through the process environment only.'
      )
    )
    if (targetSafe && token) {
      const prefix = `accounts/${ACCOUNT}`
      const dbBinding = config.d1_databases.find(item => item.binding === 'DB')
      const target = `${prefix}/d1/database/${dbBinding.database_id}`
      try {
        const metadata = await cloudflareRequest(target, { token, fetchImpl })
        checks.push(
          check(
            'remote-d1-identity',
            metadata.uuid === dbBinding.database_id && metadata.name === dbBinding.database_name,
            'Remote D1 UUID and name must equal the explicit staging binding.'
          )
        )
        checks.push(
          check(
            'remote-d1-jurisdiction',
            metadata.jurisdiction === 'eu',
            'Reviewed staging database must retain EU jurisdiction.'
          )
        )
        const rows = await cloudflareRequest(`${target}/query`, {
          token,
          fetchImpl,
          sql: SCHEMA_QUERY
        })
        const comparison = compareSchema(
          expected,
          rows.flatMap(item => item.results || [])
        )
        checks.push(check('remote-schema', comparison.ok, comparison))
      } catch {
        checks.push(
          check(
            'remote-d1-readable',
            false,
            'D1 metadata/schema could not be read; no provider body is logged.'
          )
        )
      }
      try {
        const settings = await cloudflareRequest(
          `${prefix}/workers/scripts/${encodeURIComponent(config.name)}/settings`,
          { token, fetchImpl }
        )
        const binding = settings.bindings?.find(item => item.name === 'DB' && item.type === 'd1')
        checks.push(
          check(
            'remote-worker-d1-binding',
            binding?.id === dbBinding.database_id,
            'Deployed Worker DB must match the reviewed staging database.'
          )
        )
        const getVar = name =>
          settings.bindings?.find(item => item.name === name && item.type === 'plain_text')?.text
        checks.push(
          check(
            'remote-worker-stage',
            getVar('NATIVE_API_STAGE') === config.vars.NATIVE_API_STAGE,
            'Deployed staging gate must match the reviewed configuration.'
          )
        )
        checks.push(
          check(
            'remote-worker-timezone',
            getVar('SOURCE_TIMESTAMP_TIMEZONE') === config.vars.SOURCE_TIMESTAMP_TIMEZONE,
            'Deployed timestamp policy must match the reviewed configuration.'
          )
        )
        const identity = settings.bindings?.find(
          item => item.name === 'AUTH_CLIENT_ID' && item.type === 'service'
        )
        const identityConfig = config.services?.find(item => item.binding === 'AUTH_CLIENT_ID')
        checks.push(
          check(
            'remote-worker-identity-binding',
            !!identityConfig && identity?.service === identityConfig.service,
            'Deployed auth identity service must match the private reviewed staging service.'
          )
        )
        const media = settings.bindings?.find(
          item => item.name === 'MEDIA' && item.type === 'r2_bucket'
        )
        const mediaConfig = config.r2_buckets?.find(item => item.binding === 'MEDIA')
        checks.push(
          check(
            'remote-worker-media-binding',
            !!mediaConfig && media?.bucket_name === mediaConfig.bucket_name,
            'Deployed private photo bucket must match the reviewed MEDIA binding.'
          )
        )
      } catch {
        checks.push(
          check(
            'remote-worker-settings-readable',
            false,
            'Worker settings could not be read; no binding values are printed.'
          )
        )
      }
      try {
        const secrets = await cloudflareRequest(
          `${prefix}/workers/scripts/${encodeURIComponent(config.name)}/secrets`,
          { token, fetchImpl }
        )
        const names = secrets.filter(item => typeof item.name === 'string').map(item => item.name)
        const inspected = inspectConfig(config, { profile, secretNames: names })
        for (const item of inspected.filter(item => item.id.startsWith('secret:'))) {
          checks.splice(
            checks.findIndex(prior => prior.id === item.id),
            1,
            item
          )
        }
      } catch {
        checks.push(
          check(
            'remote-secrets-readable',
            false,
            'Worker secret metadata could not be read; no values are requested or printed.'
          )
        )
      }
    }
  } else
    checks.push({
      id: 'remote-state',
      status: 'unverified',
      detail: 'Offline mode does not verify deployed database, bindings or secrets.'
    })
  return {
    formatVersion: 1,
    mode: remote ? 'remote-read-only' : 'offline',
    profile,
    productionReady: false,
    preflightPassed: checks.every(item => item.status === 'pass'),
    counts: {
      sourceTables: manifest.tables.length,
      expectedNativeSchemaObjects: expected.length,
      routes: generated.summary.routes
    },
    checks
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2),
      options = {}
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--remote') options.remote = true
      else if (['--config', '--profile', '--local-schema'].includes(args[i])) {
        if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing argument')
        const key = {
          '--config': 'configPath',
          '--profile': 'profile',
          '--local-schema': 'schemaPath'
        }[args[i]]
        options[key] = args[++i]
      } else throw new Error('Unsupported argument')
    }
    const result = await runPreflight(options)
    console.log(JSON.stringify(result, null, 2))
    if (!result.preflightPassed) process.exitCode = 1
  } catch {
    console.error(
      'Preflight failed: inspect input/configuration locally. No secrets, provider bodies or customer rows are printed.'
    )
    process.exitCode = 1
  }
}
