import { ApiError } from './errors.js'

export async function sha256(value) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  )
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function trustedClientSubject(request, env) {
  // Do not infer trust from CF-Connecting-IP or request.cf alone: same-zone
  // Worker subrequests can change the IP header. Only a bound trusted ingress
  // identity provider may attest a canonical IP(/56 for IPv6) rate subject.
  if (!env.AUTH_CLIENT_ID?.fetch)
    throw new ApiError(503, { error: 'Trusted auth client identity unavailable' })
  let subject
  try {
    const assertion = request.headers.get('X-EasyMemoir-Client-Identity')
    if (assertion && assertion.length > 2048) throw new Error('Identity assertion too large')
    // Only a dedicated signed network assertion crosses this binding. Never
    // disclose the user's JWT, credentials, cookies or request body.
    const response = await env.AUTH_CLIENT_ID.fetch(
      new Request('https://auth-identity.internal/verify', {
        method: 'POST',
        headers: {
          'X-EasyMemoir-Auth-Path': new URL(request.url).pathname,
          ...(assertion ? { 'X-EasyMemoir-Client-Identity': assertion } : {})
        }
      })
    )
    if (!response.ok) throw new Error('Identity rejected')
    const identity = await response.json()
    subject = identity.subject
    if (typeof subject !== 'string' || subject.length > 128 || !/^ip:[0-9a-f.:/]+$/i.test(subject))
      throw new Error('Invalid rate subject')
  } catch {
    throw new ApiError(503, { error: 'Trusted auth client identity unavailable' })
  }
  return subject.toLowerCase()
}

export async function enforceSubjectRateLimit(
  request,
  env,
  db,
  now,
  { namespace = '', window = 900, maximum = 10 } = {}
) {
  if (authRateMode(env) === 'account-budget') {
    if (namespace !== 'voice-demo:')
      throw new ApiError(503, { error: 'Authentication rate policy misconfigured' })
    await enforceAccountBudget(db, env, now, { demo: true })
    // No network identity exists in this mode. A bounded demo reservation gets
    // its own coordinator; all reservations share the strict global budget.
    return sha256(`voice-demo:${crypto.randomUUID()}`)
  }
  const subject = await trustedClientSubject(request, env)
  const key = await sha256(namespace + subject)
  const seconds = Math.floor(now / 1000)
  const row = await db
    .prepare(
      `INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts)
    VALUES(?,?,1) ON CONFLICT(subject_hash) DO UPDATE SET
      window_started_at=CASE WHEN auth_rate_limits.window_started_at<=?-? THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END,
      attempts=CASE WHEN auth_rate_limits.window_started_at<=?-? THEN 1 ELSE auth_rate_limits.attempts+1 END
    RETURNING attempts,window_started_at`
    )
    .bind(key, seconds, seconds, window, seconds, window)
    .first()
  if (row.attempts > maximum)
    throw new ApiError(429, {
      error: namespace
        ? 'Too many voice demo requests. Please try again later.'
        : 'Too many login attempts, please try again in 15 minutes',
      retryAfter: Math.max(1, row.window_started_at + window - seconds)
    })
  return key
}
export function authRateMode(env) {
  const mode = env.AUTH_RATE_MODE ?? 'trusted-ingress'
  if (!['trusted-ingress', 'account-budget'].includes(mode))
    throw new ApiError(503, { error: 'Authentication rate policy misconfigured' })
  return mode
}
function configuredInteger(env, name, fallback, min, max) {
  const value = env[name] ?? String(fallback)
  if (
    typeof value !== 'string' ||
    !/^\d{1,6}$/.test(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new ApiError(503, { error: 'Authentication rate policy misconfigured' })
  return Number(value)
}
function budgetSettings(env) {
  const globalMaximum = configuredInteger(env, 'AUTH_GLOBAL_RATE_LIMIT_MAX', 120, 1, 1000)
  const accountMaximum = configuredInteger(env, 'AUTH_ACCOUNT_RATE_LIMIT_MAX', 10, 1, globalMaximum)
  const window = configuredInteger(env, 'AUTH_RATE_WINDOW_SECONDS', 900, 60, 3600)
  return { globalMaximum, accountMaximum, window }
}
function budgetStatement(db, key, started, maximum) {
  return db
    .prepare(
      `INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts)
    VALUES(?,?,1)
    ON CONFLICT(subject_hash) DO UPDATE SET
      window_started_at=excluded.window_started_at,
      attempts=CASE WHEN auth_rate_limits.window_started_at=excluded.window_started_at THEN MIN(auth_rate_limits.attempts+1,?+1) ELSE 1 END
    RETURNING attempts,window_started_at`
    )
    .bind(key, started, maximum)
}
async function enforceAccountBudget(db, env, now, { account, demo = false } = {}) {
  const settings = budgetSettings(env)
  const window = demo ? 3600 : settings.window,
    maximum = demo ? 5 : settings.globalMaximum,
    seconds = Math.floor(now / 1000),
    started = Math.floor(seconds / window) * window,
    globalKey = demo ? 'budget:demo:global' : 'budget:auth:global'
  const statements = [budgetStatement(db, globalKey, started, maximum)]
  if (account) {
    const hash = await sha256(account)
    // Only admitted global reservations create account rows. Rotating arbitrary
    // addresses cannot grow this table beyond the global accepted budget.
    const key = `budget:auth:account:${hash}`
    statements.push(
      db
        .prepare(
          `INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts)
      SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM auth_rate_limits WHERE subject_hash=? AND window_started_at=? AND attempts<=?)
      ON CONFLICT(subject_hash) DO UPDATE SET window_started_at=excluded.window_started_at,
      attempts=CASE WHEN auth_rate_limits.window_started_at=excluded.window_started_at THEN MIN(auth_rate_limits.attempts+1,?+1) ELSE 1 END
      RETURNING attempts,window_started_at`
        )
        .bind(key, started, globalKey, started, maximum, settings.accountMaximum)
    )
  }
  const rows = await db.batch(statements)
  if (
    rows[0].results[0]?.attempts > maximum ||
    (account && (!rows[1].results[0] || rows[1].results[0].attempts > settings.accountMaximum))
  )
    throw new ApiError(429, {
      error: demo
        ? 'Too many voice demo requests. Please try again later.'
        : 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.max(1, started + window - seconds)
    })
  if (!rows[0].results[0])
    throw new ApiError(503, { error: 'Authentication rate budget unavailable' })
}
export const enforceAuthRateLimit = (request, env, db, now, options = {}) =>
  authRateMode(env) === 'account-budget'
    ? enforceAccountBudget(db, env, now, options)
    : enforceSubjectRateLimit(request, env, db, now)

// Magic-link URLs contain a secret. Their new public exchange uses the strict
// deployment budget and never forwards that path/token to an identity service.
export async function enforceOpaqueLinkBudget(env, db, now) {
  authRateMode(env)
  await enforceAccountBudget(db, env, now)
}
