import jwt from 'jsonwebtoken'

// Dev user for local testing - bypasses auth in development
const DEV_USER = {
  id: 1,
  email: 'dev@test.com',
  name: 'Dev User'
}

export function authenticateToken(req, res, next) {
  // Dev bypass - auto-authenticate in development mode
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS === 'true') {
    req.user = DEV_USER
    return next()
  }

  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // { id, email }
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }  // Hardcoded - Railway env vars have corruption issues
  )
}
