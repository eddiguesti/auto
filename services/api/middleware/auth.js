// @ts-check
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import {
  isTokenBlacklisted,
  isUserTokenBlacklisted,
  assertCanonicalToken,
  tokenRevocationKey
} from '../utils/tokenBlacklist.js'

// Dev user for local testing - bypasses auth in development
const DEV_USER = {
  id: 1,
  email: 'dev@test.com',
  name: 'Dev User'
}

export async function authenticateToken(req, res, next) {
  // Dev bypass - ONLY in explicit development mode with bypass flag
  // Security: requires NODE_ENV to be explicitly 'development', not just 'not production'
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS === 'true') {
    req.user = DEV_USER
    return next()
  }

  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && /^Bearer (\S+)$/i.exec(authHeader)?.[1]

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const secret = process.env.JWT_SECRET

    // Security: Ensure JWT_SECRET is properly configured
    if (!secret || secret.includes('CHANGE_ME') || secret.length < 32) {
      console.error('JWT_SECRET not properly configured')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    assertCanonicalToken(token)
    const decoded = jwt.verify(token, secret)
    const database = req.app?.locals?.db
    const revocationKey = tokenRevocationKey(decoded, token)

    // Check if this specific token has been blacklisted (logout / account deletion)
    if (await isTokenBlacklisted(revocationKey, database)) {
      return res.status(401).json({ error: 'Token revoked' })
    }

    // Check if all user tokens were blacklisted (password reset)
    if (decoded.iat && (await isUserTokenBlacklisted(decoded.id, decoded.iat, database))) {
      return res.status(401).json({ error: 'Token revoked' })
    }

    // Revocation rows can cascade during account deletion. A still-signed token
    // must never authenticate a deleted account, including older sessions.
    let account
    try {
      account = await database.query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [
        decoded.id
      ])
    } catch {
      return res
        .status(503)
        .json({ error: 'Account verification unavailable', code: 'AUTH_UNAVAILABLE' })
    }
    if (!account.rows.length) return res.status(401).json({ error: 'Account no longer available' })

    req.user = decoded // { id, email, jti }
    req.token = token
    next()
  } catch (error) {
    if (error.code === 'REVOCATION_UNAVAILABLE') {
      return res
        .status(503)
        .json({ error: 'Token revocation service unavailable', code: error.code })
    }
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

/**
 * @param {{ id: number, email: string }} user
 * @returns {string}
 */
export function generateToken(user) {
  const secret = process.env.JWT_SECRET

  // Security: Ensure JWT_SECRET is properly configured
  if (!secret || secret.includes('CHANGE_ME') || secret.length < 32) {
    throw new Error('JWT_SECRET not properly configured. Generate with: openssl rand -base64 64')
  }

  // Use hardcoded default - env var parsing has caused issues
  // Valid formats: '7d', '24h', '60' (seconds as string), 3600 (seconds as number)
  const DEFAULT_EXPIRES = '7d'

  let expiresIn = DEFAULT_EXPIRES
  const rawValue = process.env.JWT_EXPIRES_IN

  if (rawValue) {
    // Clean the value: trim whitespace, remove surrounding quotes
    const cleaned = String(rawValue)
      .trim()
      .replace(/^["']|["']$/g, '')
    // Validate format: must be like "7d", "24h", "60m", or a number
    const numericSeconds = /^\d+$/.test(cleaned) ? Number(cleaned) : null
    if (numericSeconds !== null && Number.isSafeInteger(numericSeconds) && numericSeconds > 0) {
      // jsonwebtoken interprets bare strings as milliseconds, but numeric
      // expiresIn values are seconds, matching our documented configuration.
      expiresIn = numericSeconds
    } else if (/^\d+[smhd]$/.test(cleaned)) {
      expiresIn = cleaned
    } else {
      console.warn(
        `Invalid JWT_EXPIRES_IN format: "${rawValue}", using default: ${DEFAULT_EXPIRES}`
      )
    }
  }

  const jti = crypto.randomBytes(16).toString('hex')
  return jwt.sign({ id: user.id, email: user.email, jti }, secret, { expiresIn })
}

/**
 * Middleware factory for JWT scope enforcement.
 * - No args = requires full-scope token (rejects scoped tokens like magic_link)
 * - With args = requires one of the listed scopes
 */
export function requireScope(...allowedScopes) {
  return (req, res, next) => {
    const tokenScope = req.user?.scope
    // Full-scope tokens (from login) have no scope claim — always allowed when no scopes specified
    if (!tokenScope && allowedScopes.length === 0) return next()
    if (!tokenScope) return next()
    // Scoped token trying to access a full-scope-only route
    if (allowedScopes.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (allowedScopes.includes(tokenScope)) return next()
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
}
