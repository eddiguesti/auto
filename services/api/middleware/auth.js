import jwt from 'jsonwebtoken'

// Dev user for local testing - bypasses auth in development
const DEV_USER = {
  id: 1,
  email: 'dev@test.com',
  name: 'Dev User'
}

export function authenticateToken(req, res, next) {
  // Dev bypass - ONLY in explicit development mode with bypass flag
  // Security: requires NODE_ENV to be explicitly 'development', not just 'not production'
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS === 'true') {
    req.user = DEV_USER
    return next()
  }

  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

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

    const decoded = jwt.verify(token, secret)
    req.user = decoded // { id, email }
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export function generateToken(user) {
  const secret = process.env.JWT_SECRET

  // Security: Ensure JWT_SECRET is properly configured
  if (!secret || secret.includes('CHANGE_ME') || secret.length < 32) {
    throw new Error('JWT_SECRET not properly configured. Generate with: openssl rand -base64 64')
  }

  // Validate expiresIn - must be non-empty string or number
  // Strip quotes and whitespace that might come from env var misconfiguration
  const rawExpiresIn = process.env.JWT_EXPIRES_IN || ''
  const cleanedExpiresIn = rawExpiresIn.trim().replace(/^["']|["']$/g, '')
  const validExpiresIn = cleanedExpiresIn !== '' ? cleanedExpiresIn : '7d'

  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: validExpiresIn })
}
