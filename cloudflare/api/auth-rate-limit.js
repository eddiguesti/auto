import { ApiError } from './errors.js'

export async function sha256(value) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  )
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function enforceAuthRateLimit(request, env, db, now) {
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
  const key = await sha256(subject.toLowerCase())
  const seconds = Math.floor(now / 1000)
  const row = await db
    .prepare(
      `INSERT INTO auth_rate_limits (subject_hash, window_started_at, attempts)
    VALUES (?, ?, 1) ON CONFLICT (subject_hash) DO UPDATE SET
      window_started_at = CASE WHEN auth_rate_limits.window_started_at <= ? - 900 THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END,
      attempts = CASE WHEN auth_rate_limits.window_started_at <= ? - 900 THEN 1 ELSE auth_rate_limits.attempts + 1 END
    RETURNING attempts, window_started_at`
    )
    .bind(key, seconds, seconds, seconds)
    .first()
  if (row.attempts > 10)
    throw new ApiError(429, {
      error: 'Too many login attempts, please try again in 15 minutes',
      retryAfter: Math.max(1, row.window_started_at + 900 - seconds)
    })
}
