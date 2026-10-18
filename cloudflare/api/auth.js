import { ApiError } from './errors.js'

function decodePart(value, decodeText = true) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid JWT encoding')
  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), character =>
    character.charCodeAt(0)
  )
  const canonical = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  if (canonical !== value) throw new Error('Noncanonical JWT encoding')
  return {
    bytes,
    text: decodeText ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : null
  }
}

export async function verifyToken(request, secret, now = Date.now()) {
  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new ApiError(401, { error: 'Authentication required' })
  if (!secret || secret.length < 32 || secret.includes('CHANGE_ME'))
    throw new ApiError(500, { error: 'Server configuration error' })
  try {
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization)
    if (!match || authorization.length > 16384) throw new Error('Malformed authorization')
    const token = match[1]
    const [headerPart, payloadPart, signaturePart] = token.split('.')
    const header = JSON.parse(decodePart(headerPart).text)
    if (header.alg !== 'HS256' || (header.typ && header.typ !== 'JWT') || header.crit)
      throw new Error('Unsupported JWT header')
    const signature = decodePart(signaturePart, false).bytes
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        key,
        signature,
        new TextEncoder().encode(`${headerPart}.${payloadPart}`)
      ))
    )
      throw new Error('JWT signature mismatch')
    const claims = JSON.parse(decodePart(payloadPart).text)
    const seconds = Math.floor(now / 1000)
    if (
      !Number.isInteger(claims.id) ||
      claims.id <= 0 ||
      claims.id > 2147483647 ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= seconds ||
      claims.exp > 8640000000000 ||
      !Number.isSafeInteger(claims.iat) ||
      claims.iat < 0 ||
      claims.iat > seconds ||
      (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > seconds)) ||
      (claims.jti !== undefined &&
        (typeof claims.jti !== 'string' || !claims.jti || claims.jti.length > 255)) ||
      (claims.scope !== undefined && typeof claims.scope !== 'string')
    )
      throw new Error('Invalid JWT claims')
    let revocationKey = claims.jti
    if (!revocationKey) {
      // Legacy magic-link JWTs omit JTI. Persist a fingerprint to support real
      // single-token logout without invalidating other devices or storing tokens.
      const hash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
      )
      revocationKey = `sha256:${Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('')}`
    }
    return { claims, revocationKey }
  } catch {
    throw new ApiError(403, { error: 'Invalid or expired token' })
  }
}

export function requireFullScope(claims) {
  if (claims.scope) throw new ApiError(403, { error: 'Insufficient permissions' })
}

export function requireSigningSecret(secret) {
  if (!secret || secret.length < 32 || secret.includes('CHANGE_ME'))
    throw new ApiError(500, { error: 'Server configuration error' })
}

export function randomHex(length) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

export function tokenLifetime(raw) {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  const match = /^(\d+)([smhd]?)$/.exec(cleaned)
  const seconds = match
    ? Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 1)
    : NaN
  return Number.isSafeInteger(seconds) &&
    seconds > 0 &&
    seconds < 8640000000000 - Math.floor(Date.now() / 1000)
    ? seconds
    : 7 * 86400
}

const encode = bytes =>
  btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
export async function issueToken(user, env, now = Date.now()) {
  requireSigningSecret(env.JWT_SECRET)
  const iat = Math.floor(now / 1000)
  const claims = {
    id: user.id,
    email: user.email,
    jti: randomHex(16),
    iat,
    exp: iat + tokenLifetime(env.JWT_EXPIRES_IN)
  }
  const input = `${encode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))}.${encode(new TextEncoder().encode(JSON.stringify(claims)))}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  )
  return `${input}.${encode(signature)}`
}
