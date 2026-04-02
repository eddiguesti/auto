import rateLimit from 'express-rate-limit'

// Global rate limiting
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
})

// Strict rate limiting for auth routes (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes' }
})

// Support chat rate limiting — ≤ 10/hour per IP to limit AI cost abuse
export const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many support requests, please try again later' }
})

// Rate limit for landing voice sessions (prevent API key abuse)
export const voiceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 sessions per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many voice session requests, please try again later' }
})

// Newsletter subscription — prevent subscription abuse
export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 subscription attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many newsletter requests, please try again later' }
})

// Magic link routes — prevent token flooding
export const magicLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
})

// SEO routes — prevent scraping
export const seoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
})
