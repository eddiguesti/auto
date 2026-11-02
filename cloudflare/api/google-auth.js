import { ApiError } from './errors.js'
import { timestampForStorage } from './value-codecs.js'

const encoder = new TextEncoder()
let cachedKeys = null,
  pendingKeys = null
function decode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('Invalid Google credential')
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char =>
    char.charCodeAt(0)
  )
  const canonical = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
  if (canonical !== value) throw new Error('Invalid Google encoding')
  return bytes
}
const parsed = value => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decode(value)))
// This unverified claim selects only an abuse counter, like an entered login
// email. It grants no identity; every accepted login verifies the signature.
export function googleBudgetSubject(credential) {
  try {
    if (typeof credential !== 'string' || credential.length > 5000) return undefined
    const email = parsed(credential.split('.')[1]).email
    if (typeof email !== 'string') return undefined
    const normalized = email.trim().toLowerCase()
    return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
      ? `email:${normalized}`
      : undefined
  } catch {
    return undefined
  }
}
async function keys(env, now, refresh = false) {
  if (cachedKeys?.expires > now && (!refresh || now < cachedKeys.fetchedAt + 30000))
    return cachedKeys.keys
  if (pendingKeys) return pendingKeys
  pendingKeys = (async () => {
    try {
      const response = await (env.GOOGLE_JWKS_FETCH || { fetch }).fetch(
        'https://www.googleapis.com/oauth2/v3/certs',
        { redirect: 'manual', signal: AbortSignal.timeout(10000) }
      )
      if (!response.ok || !response.body) throw new Error('Google keys unavailable')
      const reader = response.body.getReader(),
        chunks = []
      let size = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 65536) {
          await reader.cancel()
          throw new Error('Google keys too large')
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (!Array.isArray(value.keys) || !value.keys.length || value.keys.length > 20)
        throw new Error('Invalid Google keys')
      const maxAge = /\bmax-age=(\d+)\b/i.exec(response.headers.get('Cache-Control') || '')
      cachedKeys = {
        keys: value.keys,
        fetchedAt: now,
        expires: now + Math.max(30, Math.min(Number(maxAge?.[1] ?? 300), 3600)) * 1000
      }
      return value.keys
    } catch {
      throw new ApiError(503, { error: 'Google Sign-In temporarily unavailable' })
    }
  })()
  try {
    return await pendingKeys
  } finally {
    pendingKeys = null
  }
}
export async function verifyGoogleCredential(credential, env, now = Date.now()) {
  if (
    typeof env.GOOGLE_CLIENT_ID !== 'string' ||
    !env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
  )
    throw new ApiError(503, { error: 'Google Sign-In is not configured' })
  try {
    if (typeof credential !== 'string' || credential.length > 5000)
      throw new Error('Invalid credential')
    const parts = credential.split('.')
    if (parts.length !== 3) throw new Error('Invalid credential')
    const header = parsed(parts[0]),
      claims = parsed(parts[1])
    if (
      header.alg !== 'RS256' ||
      header.crit ||
      typeof header.kid !== 'string' ||
      header.kid.length > 256
    )
      throw new Error('Unsupported signing key')
    const seconds = Math.floor(now / 1000)
    if (
      !['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss) ||
      claims.aud !== env.GOOGLE_CLIENT_ID ||
      (claims.azp !== undefined && claims.azp !== env.GOOGLE_CLIENT_ID) ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= seconds ||
      !Number.isSafeInteger(claims.iat) ||
      claims.iat > seconds + 30 ||
      claims.iat < seconds - 86400 ||
      claims.exp > claims.iat + 86400 ||
      (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > seconds)) ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      claims.sub.length > 255 ||
      claims.email_verified !== true ||
      typeof claims.email !== 'string' ||
      claims.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
    )
      throw new Error('Invalid Google claims')
    let jwks = await keys(env, now)
    if (!jwks.some(key => key.kid === header.kid)) jwks = await keys(env, now, true)
    const matches = jwks.filter(
      key =>
        key.kid === header.kid &&
        key.kty === 'RSA' &&
        (!key.alg || key.alg === 'RS256') &&
        (!key.use || key.use === 'sig')
    )
    if (matches.length !== 1 || decode(matches[0].n).byteLength < 256)
      throw new Error('Unknown Google key')
    const key = await crypto.subtle.importKey(
      'jwk',
      matches[0],
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
    if (
      !(await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        decode(parts[2]),
        encoder.encode(`${parts[0]}.${parts[1]}`)
      ))
    )
      throw new Error('Google signature mismatch')
    const email = claims.email.trim().toLowerCase()
    const name =
      typeof claims.name === 'string' && claims.name.trim()
        ? claims.name.trim().slice(0, 100)
        : email.split('@')[0]
    let avatar = null
    if (typeof claims.picture === 'string' && claims.picture.length <= 2048) {
      const url = new URL(claims.picture)
      if (url.protocol === 'https:' && !url.username && !url.password) avatar = url.href
    }
    const authoritative =
      email.endsWith('@gmail.com') || (typeof claims.hd === 'string' && claims.hd.length > 0)
    return { googleId: claims.sub, email, name, avatar, authoritative }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(401, { error: 'Invalid Google credential' })
  }
}
export async function googleAccount(db, identity, now) {
  const { googleId, email, name, avatar, authoritative } = identity,
    wall = timestampForStorage(now)
  // D1 batches serialize lookup/link/create. Every write carries the current
  // account guard; a deleted user or competing Google identity cannot be linked.
  let result
  try {
    result = await db.batch([
      db
        .prepare(
          `INSERT INTO users(email,google_id,name,avatar_url,email_verified,email_verified_at,created_at,updated_at)
        SELECT ?,?,?,?,1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM users WHERE google_id=? OR email=?) RETURNING id`
        )
        .bind(email, googleId, name, avatar, wall, wall, wall, googleId, email),
      db
        .prepare(
          `INSERT INTO user_game_state(user_id,game_mode_enabled,created_at,updated_at) SELECT id,0,?,? FROM users WHERE changes()=1 AND google_id=?`
        )
        .bind(wall, wall, googleId),
      db
        .prepare(
          `INSERT OR IGNORE INTO user_collection_progress(user_id,collection_id) SELECT u.id,c.id FROM users u CROSS JOIN collections c WHERE u.google_id=? AND u.deleted_at IS NULL AND c.is_active=1`
        )
        .bind(googleId),
      db
        .prepare(
          `UPDATE users SET google_id=?,avatar_url=?,email_verified=1,email_verified_at=COALESCE(email_verified_at,?),updated_at=?
        WHERE deleted_at IS NULL AND (google_id=? OR (email=? AND google_id IS NULL AND ?=1 AND NOT EXISTS(SELECT 1 FROM users WHERE google_id=?))) RETURNING id,email,name,avatar_url,google_id`
        )
        .bind(googleId, avatar, wall, wall, googleId, email, authoritative ? 1 : 0, googleId)
    ])
  } catch (error) {
    if (!error.message?.includes('UNIQUE constraint failed')) throw error
    throw new ApiError(409, { error: 'This email is already linked to a different Google account' })
  }
  const user = result[3].results[0]
  if (!user)
    throw new ApiError(409, {
      error: 'Sign in with your existing account before linking this Google account'
    })
  return user
}
