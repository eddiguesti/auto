import { createPublicKey, randomUUID, timingSafeEqual, verify } from 'node:crypto'
import jwt from 'jsonwebtoken'

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function base64(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null
  const bytes = Buffer.from(value, 'base64')
  return bytes.length === length && bytes.toString('base64') === value ? bytes : null
}

// Telnyx signs timestamp + "|" + the exact raw request body with Ed25519.
export function verifyTelnyxWebhook(body, headers, publicKey, now = Date.now()) {
  const timestamp = headers['telnyx-timestamp']
  const signature = base64(headers['telnyx-signature-ed25519'], 64)
  const key = base64(publicKey, 32)
  if (!Buffer.isBuffer(body) || !signature || !key || !/^\d+$/.test(timestamp || '')) return false
  const seconds = Number(timestamp)
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(now / 1000) - seconds) > 300)
    return false
  try {
    return verify(
      null,
      Buffer.concat([Buffer.from(`${timestamp}|`), body]),
      createPublicKey({
        key: Buffer.concat([ED25519_SPKI_PREFIX, key]),
        format: 'der',
        type: 'spki'
      }),
      signature
    )
  } catch {
    return false
  }
}

function streamSecret() {
  const secret = process.env.TELNYX_STREAM_SECRET || process.env.JWT_SECRET
  if (!secret || secret.length < 32 || /CHANGE_ME/i.test(secret))
    throw new Error('Telnyx stream signing secret is not configured')
  return secret
}

export function createTelnyxStreamToken(userId) {
  const nonce = randomUUID()
  return {
    nonce,
    token: jwt.sign({ userId, nonce }, streamSecret(), {
      audience: 'telnyx-stream',
      expiresIn: '10m',
      algorithm: 'HS256'
    })
  }
}

export function verifyTelnyxStreamToken(token) {
  try {
    const claims = jwt.verify(token, streamSecret(), {
      audience: 'telnyx-stream',
      algorithms: ['HS256']
    })
    if (!Number.isInteger(claims.userId) || claims.userId <= 0 || typeof claims.nonce !== 'string')
      return null
    return claims
  } catch {
    return null
  }
}

export function secretMatches(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || !expected) return false
  const left = Buffer.from(actual),
    right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}
