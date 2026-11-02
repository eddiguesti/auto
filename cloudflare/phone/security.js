import { ApiError } from '../api/errors.js'
import { requireSigningSecret, randomHex } from '../api/auth.js'

const encode = bytes => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
const urlEncode = bytes =>
  encode(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const text = value => new TextEncoder().encode(value)
function decoded(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null
  try {
    const bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0))
    return bytes.length === length && encode(bytes) === value ? bytes : null
  } catch {
    return null
  }
}
const timestampValid = (value, now) =>
  typeof value === 'string' &&
  /^(?:0|[1-9]\d{0,15})$/.test(value) &&
  Number.isSafeInteger(Number(value)) &&
  Math.abs(Math.floor(now / 1000) - Number(value)) <= 300
const concat = (a, b) => {
  const bytes = new Uint8Array(a.length + b.length)
  bytes.set(a)
  bytes.set(b, a.length)
  return bytes
}
export async function rawPhoneBody(request, limit = 1024 * 1024) {
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader(),
    chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new ApiError(413, { error: 'Phone request body too large' })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}
export async function verifyPhoneWebhook(bytes, headers, publicKey, now = Date.now()) {
  const timestamp = headers.get('telnyx-timestamp'),
    signature = decoded(headers.get('telnyx-signature-ed25519'), 64),
    keyBytes = decoded(publicKey, 32)
  if (!(bytes instanceof Uint8Array) || !signature || !keyBytes || !timestampValid(timestamp, now))
    return false
  try {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, [
      'verify'
    ])
    return crypto.subtle.verify('Ed25519', key, signature, concat(text(timestamp + '|'), bytes))
  } catch {
    return false
  }
}
async function hmac(secret, usages) {
  requireSigningSecret(secret)
  return crypto.subtle.importKey(
    'raw',
    text(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  )
}
export async function signInternalPhoneRequest(secret, body, pathname, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000)),
    message = concat(text(`phone-internal-v1|${timestamp}|POST|${pathname}|`), body)
  return {
    timestamp,
    signature: urlEncode(
      new Uint8Array(await crypto.subtle.sign('HMAC', await hmac(secret, ['sign']), message))
    )
  }
}
export async function verifyInternalPhoneRequest(request, body, env, now = Date.now()) {
  const timestamp = request.headers.get('X-Internal-Timestamp'),
    signature = request.headers.get('X-Internal-Signature')
  if (
    !timestampValid(timestamp, now) ||
    typeof signature !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    return false
  try {
    const bytes = Uint8Array.from(
      atob(signature.replaceAll('-', '+').replaceAll('_', '/')),
      value => value.charCodeAt(0)
    )
    if (urlEncode(bytes) !== signature) return false
    const message = concat(
      text(`phone-internal-v1|${timestamp}|POST|${new URL(request.url).pathname}|`),
      body
    )
    return crypto.subtle.verify(
      'HMAC',
      await hmac(env.INTERNAL_CRON_SECRET, ['verify']),
      bytes,
      message
    )
  } catch {
    return false
  }
}
export async function issuePhoneTicket(
  requestId,
  userId,
  env,
  now = Date.now(),
  deadline = now + 600_000
) {
  const value = {
    aud: 'easy-memoir-phone',
    requestId,
    userId,
    nonce: randomHex(32),
    iat: Math.floor(now / 1000),
    exp: Math.floor(Math.min(now + 600_000, deadline) / 1000)
  }
  const payload = urlEncode(text(JSON.stringify(value)))
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      await hmac(env.TELNYX_STREAM_SECRET || env.JWT_SECRET, ['sign']),
      text(`phone-v1.${payload}`)
    )
  )
  return { value, ticket: payload + '.' + urlEncode(signature) }
}
export async function verifyPhoneTicket(ticket, env, now = Date.now()) {
  try {
    if (typeof ticket !== 'string' || ticket.length > 1024) throw new Error()
    const parts = ticket.split('.')
    if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error()
    const bytes = parts.map(part =>
      Uint8Array.from(atob(part.replaceAll('-', '+').replaceAll('_', '/')), value =>
        value.charCodeAt(0)
      )
    )
    if (
      bytes.some((value, index) => urlEncode(value) !== parts[index]) ||
      !(await crypto.subtle.verify(
        'HMAC',
        await hmac(env.TELNYX_STREAM_SECRET || env.JWT_SECRET, ['verify']),
        bytes[1],
        text(`phone-v1.${parts[0]}`)
      ))
    )
      throw new Error()
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes[0])),
      seconds = Math.floor(now / 1000)
    if (
      value.aud !== 'easy-memoir-phone' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.requestId) ||
      !Number.isSafeInteger(value.userId) ||
      value.userId < 1 ||
      value.userId > 2147483647 ||
      !/^[a-f0-9]{64}$/.test(value.nonce) ||
      !Number.isSafeInteger(value.iat) ||
      !Number.isSafeInteger(value.exp) ||
      value.iat > seconds + 5 ||
      value.exp <= seconds ||
      value.exp > seconds + 600 ||
      value.exp <= value.iat
    )
      throw new Error()
    return value
  } catch {
    throw new ApiError(401, { error: 'Invalid or expired call stream ticket' })
  }
}
