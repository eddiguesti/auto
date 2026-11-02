const AUTH_PATH =
  /^\/api(?:\/v1)?\/(?:auth\/(?:login|register|google|verify-email|forgot-password|reset-password|verify-reset-token|resend-verification)|landing-voice\/session)$/
const AUDIENCE = 'easy-memoir-api'
const encoder = new TextEncoder()

export function authenticationPath(path) {
  return AUTH_PATH.test(path)
}

export function authenticationRequest(request) {
  const path = new URL(request.url).pathname
  return (
    authenticationPath(path) &&
    request.method === (path.endsWith('/verify-reset-token') ? 'GET' : 'POST')
  )
}

export function canonicalIpSubject(value) {
  if (
    typeof value !== 'string' ||
    value.length > 45 ||
    value.trim() !== value ||
    ['%', '/', '[', ']', '@'].some(marker => value.includes(marker))
  )
    throw new TypeError('Invalid client address')
  if (!value.includes(':')) {
    const parts = value.split('.')
    if (
      parts.length !== 4 ||
      parts.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)
    )
      throw new TypeError('Invalid client address')
    return `ip:${parts.join('.')}`
  }
  let address
  try {
    address = new URL(`http://[${value}]/`).hostname.slice(1, -1)
  } catch {
    throw new TypeError('Invalid client address')
  }
  const sides = address.split('::')
  const left = sides[0] ? sides[0].split(':') : []
  const right = sides[1] ? sides[1].split(':') : []
  const groups =
    sides.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
      : left
  if (groups.length !== 8) throw new TypeError('Invalid client address')
  const numbers = groups.map(part => parseInt(part, 16))
  if (numbers.slice(0, 5).every(part => part === 0) && numbers[5] === 65535) {
    return `ip:${numbers[6] >> 8}.${numbers[6] & 255}.${numbers[7] >> 8}.${numbers[7] & 255}`
  }
  // Same /56 network grouping as the source express-rate-limit default.
  return `ip:${numbers
    .slice(0, 3)
    .map(part => part.toString(16))
    .join(':')}:${(numbers[3] & 0xff00).toString(16)}::/56`
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}
function decoded(text) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new TypeError('Invalid assertion')
  const bytes = Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), char =>
    char.charCodeAt(0)
  )
  if (base64url(bytes) !== text) throw new TypeError('Invalid assertion')
  return bytes
}
async function key(secret) {
  if (typeof secret !== 'string' || encoder.encode(secret).length < 32)
    throw new TypeError('Ingress authentication not configured')
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signClientIdentity(request, env, now = Date.now()) {
  const url = new URL(request.url)
  if (!authenticationRequest(request)) return null
  // This policy must be backed by a verified WAF rule blocking ALL Worker
  // subrequests via cf.worker.upstream_zone, not a client-controlled marker.
  // Default configuration deliberately does not enable identity assertions.
  if (
    env.AUTH_INGRESS_MODE !== 'direct-custom-domain' ||
    env.AUTH_INGRESS_RULES_VERIFIED !== 'true' ||
    url.protocol !== 'https:' ||
    url.hostname !== env.AUTH_INGRESS_HOST ||
    !request.cf?.colo ||
    request.headers.has('CF-Worker') ||
    request.headers.has('x-real-ip')
  )
    throw new TypeError('Trusted direct ingress not configured')
  const ip = request.headers.get('CF-Connecting-IPv6') || request.headers.get('CF-Connecting-IP')
  canonicalIpSubject(ip)
  const payload = base64url(
    encoder.encode(
      JSON.stringify({
        v: 1,
        aud: AUDIENCE,
        path: url.pathname,
        method: request.method,
        ip,
        iat: Math.floor(now / 1000),
        nonce: crypto.randomUUID()
      })
    )
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await key(env.AUTH_INGRESS_SECRET), encoder.encode(payload))
  )
  return `${payload}.${base64url(signature)}`
}

export async function verifyClientIdentity(assertion, path, secret, now = Date.now()) {
  if (typeof assertion !== 'string' || assertion.length > 1024 || !authenticationPath(path))
    throw new TypeError('Invalid assertion')
  const parts = assertion.split('.')
  if (parts.length !== 2) throw new TypeError('Invalid assertion')
  const signature = decoded(parts[1])
  if (
    signature.length !== 32 ||
    !(await crypto.subtle.verify('HMAC', await key(secret), signature, encoder.encode(parts[0])))
  )
    throw new TypeError('Invalid assertion')
  const claims = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded(parts[0])))
  const seconds = Math.floor(now / 1000)
  if (
    claims.v !== 1 ||
    claims.aud !== AUDIENCE ||
    claims.path !== path ||
    claims.method !== (path.endsWith('/verify-reset-token') ? 'GET' : 'POST') ||
    !Number.isInteger(claims.iat) ||
    claims.iat > seconds + 5 ||
    claims.iat < seconds - 30 ||
    typeof claims.nonce !== 'string' ||
    !/^[0-9a-f-]{36}$/.test(claims.nonce)
  )
    throw new TypeError('Invalid assertion')
  return canonicalIpSubject(claims.ip)
}
