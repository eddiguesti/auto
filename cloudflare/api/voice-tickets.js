import { ApiError } from './errors.js'
import { requireSigningSecret, randomHex } from './auth.js'

const encode = value =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
function bytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid ticket')
  const output = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), v =>
    v.charCodeAt(0)
  )
  const canonical = btoa(String.fromCharCode(...output))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
  if (canonical !== value) throw new Error('Invalid ticket')
  return output
}
async function signingKey(env, usages) {
  const secret = env.VOICE_TICKET_SECRET || env.JWT_SECRET
  requireSigningSecret(secret)
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  )
}
export async function issueVoiceTicket(subject, env, now, expiresAt) {
  const value = {
    aud: 'easy-memoir-voice',
    sub: subject,
    nonce: randomHex(32),
    iat: Math.floor(now / 1000),
    exp: Math.floor(Math.min(now + 60000, expiresAt ?? now + 60000) / 1000)
  }
  const payload = encode(value)
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      await signingKey(env, ['sign']),
      new TextEncoder().encode(`voice-v1.${payload}`)
    )
  )
  return {
    value,
    ticket: `${payload}.${btoa(String.fromCharCode(...signature))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '')}`
  }
}
export async function verifyVoiceTicket(ticket, env, now = Date.now()) {
  try {
    if (typeof ticket !== 'string' || ticket.length > 1024) throw new Error('Invalid ticket')
    const parts = ticket.split('.')
    if (parts.length !== 2) throw new Error('Invalid ticket')
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        await signingKey(env, ['verify']),
        bytes(parts[1]),
        new TextEncoder().encode(`voice-v1.${parts[0]}`)
      ))
    )
      throw new Error('Invalid ticket')
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes(parts[0])))
    const seconds = Math.floor(now / 1000)
    if (
      value.aud !== 'easy-memoir-voice' ||
      !/^(?:user:[1-9]\d{0,9}|demo:[a-f0-9]{64})$/.test(value.sub) ||
      !/^[a-f0-9]{64}$/.test(value.nonce) ||
      !Number.isSafeInteger(value.exp) ||
      !Number.isSafeInteger(value.iat) ||
      value.iat > seconds + 5 ||
      value.exp <= seconds ||
      value.exp > seconds + 60 ||
      value.exp <= value.iat
    )
      throw new Error('Invalid ticket')
    return value
  } catch {
    throw new ApiError(401, { error: 'Invalid or expired voice ticket' })
  }
}
