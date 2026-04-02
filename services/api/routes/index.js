import { authenticateToken, requireScope } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { checkAIQuota } from '../middleware/aiQuota.js'
import {
  authLimiter,
  supportLimiter,
  voiceLimiter,
  newsletterLimiter,
  magicLinkLimiter,
  seoLimiter
} from '../middleware/rateLimiters.js'

import authRouter from './auth.js'
import storiesRouter from './stories.js'
import photosRouter from './photos.js'
import aiRouter from './ai.js'
import voiceRouter from './voice.js'
import luluRouter from './lulu.js'
import memoryRouter from './memory.js'
import coversRouter from './covers.js'
import seoRouter from './seo.js'
import exportRouter from './export.js'
import audiobookRouter from './audiobook.js'
import styleRouter from './style.js'
import paymentsRouter, { handleStripeWebhook } from './payments.js'
import supportRouter from './support.js'
import telegramRouter, { handleTelegramWebhook } from './telegram.js'
import onboardingRouter from './onboarding.js'
import chapterImagesRouter from './chapter-images.js'
import blogImagesRouter from './blog-images.js'
import gameRouter from './game/index.js'
import notificationRoutes from './notifications.js'
import userRouter from './user.js'
import newsletterRouter from './newsletter.js'
import chapterReviewRouter from './chapterReview.js'
import memosRouter from './memos.js'
import freeStoriesRouter from './freeStories.js'
import refundsRouter from './refunds.js'
import adminRouter from './admin.js'
import magicLinkRouter from './magicLink.js'
import analyticsRouter from './analytics.js'
import telnyxCallRouter from './telnyxCall.js'
import landingVoiceRouter from './landingVoice.js'
import cspReportRouter from './cspReport.js'

/**
 * Mount all API routes onto the Express app.
 * Centralizes route registration so index.js stays small.
 */
export function mountRoutes(app, { express, pool }) {
  // ── Public routes (no auth) ──────────────────────────────────────

  // Auth (with brute-force protection on login/register)
  app.use('/api/auth/login', authLimiter)
  app.use('/api/auth/register', authLimiter)
  app.use('/api/auth', authRouter)

  // Support chat (rate limited)
  app.use('/api/support', supportLimiter, supportRouter)

  // Newsletter subscription
  app.use('/api/newsletter', newsletterLimiter, newsletterRouter)

  // Magic link routes (for weekly topic email no-login access)
  app.use('/api/magic', magicLinkLimiter, magicLinkRouter)

  // Analytics events (fires from landing pages before login)
  app.use('/api/analytics', analyticsRouter)

  // Landing page voice demo (rate limited)
  app.use('/api/landing-voice', voiceLimiter, landingVoiceRouter)

  // CSP violation reports — custom body parser for browser report formats
  app.use(
    '/api/csp-report',
    express.json({
      type: ['application/json', 'application/csp-report', 'application/reports+json']
    }),
    cspReportRouter
  )

  // SEO routes (must be before static file serving) — cache sitemap/robots for 1 hour
  app.use(seoLimiter, seoRouter)

  // Blog image generation (protected by x-cron-secret header internally)
  app.use('/api/blog-images', blogImagesRouter)

  // ── Protected routes (require auth) ──────────────────────────────

  app.use('/api/stories', authenticateToken, storiesRouter)
  app.use('/api/photos', authenticateToken, photosRouter)
  app.use('/api/ai', authenticateToken, checkAIQuota, aiRouter)
  app.use('/api/voice', authenticateToken, checkAIQuota, voiceRouter)
  app.use('/api/memory', authenticateToken, memoryRouter)
  app.use('/api/lulu', authenticateToken, luluRouter)
  app.use('/api/covers', authenticateToken, coversRouter)
  app.use('/api/export', authenticateToken, exportRouter)
  app.use('/api/audiobook', authenticateToken, audiobookRouter)
  app.use('/api/style', authenticateToken, styleRouter)
  app.use('/api/chapter-review', authenticateToken, chapterReviewRouter)
  app.use('/api/telegram', authenticateToken, telegramRouter)
  app.use('/api/onboarding', authenticateToken, onboardingRouter)
  app.use('/api/chapter-images', authenticateToken, chapterImagesRouter)
  app.use('/api/game', authenticateToken, gameRouter)
  app.use('/api/notifications', authenticateToken, notificationRoutes)
  app.use('/api/memos', authenticateToken, memosRouter)
  app.use('/api/free-stories', authenticateToken, freeStoriesRouter)

  // Full-scope only (magic link tokens cannot access these)
  app.use('/api/payments', authenticateToken, requireScope(), paymentsRouter)
  app.use('/api/user', authenticateToken, requireScope(), userRouter)
  app.use('/api/refunds', authenticateToken, requireScope(), refundsRouter)

  // Admin — requireAdmin applied at mount so it's explicit and visible here
  app.use('/api/admin', authenticateToken, requireAdmin, adminRouter)

  // ── Webhooks (no auth — verified by signature/secret) ────────────

  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) =>
    handleStripeWebhook(req, res, pool)
  )
  app.post('/api/webhooks/telegram', (req, res) => handleTelegramWebhook(req, res, pool))

  // Telnyx call routes (public — webhook + call initiation with internal secret)
  app.use('/api/telnyx', telnyxCallRouter)

  // ── v1 aliases — same routers, different prefix ───────────────────
  // Allows clients to adopt /api/v1/ without breaking existing /api/ consumers.

  app.use('/api/v1/auth/login', authLimiter)
  app.use('/api/v1/auth/register', authLimiter)
  app.use('/api/v1/auth', authRouter)

  app.use('/api/v1/support', supportLimiter, supportRouter)
  app.use('/api/v1/newsletter', newsletterLimiter, newsletterRouter)
  app.use('/api/v1/magic', magicLinkLimiter, magicLinkRouter)
  app.use('/api/v1/analytics', analyticsRouter)
  app.use('/api/v1/landing-voice', voiceLimiter, landingVoiceRouter)
  app.use('/api/v1/blog-images', blogImagesRouter)

  app.use('/api/v1/stories', authenticateToken, storiesRouter)
  app.use('/api/v1/photos', authenticateToken, photosRouter)
  app.use('/api/v1/ai', authenticateToken, checkAIQuota, aiRouter)
  app.use('/api/v1/voice', authenticateToken, checkAIQuota, voiceRouter)
  app.use('/api/v1/memory', authenticateToken, memoryRouter)
  app.use('/api/v1/lulu', authenticateToken, luluRouter)
  app.use('/api/v1/covers', authenticateToken, coversRouter)
  app.use('/api/v1/export', authenticateToken, exportRouter)
  app.use('/api/v1/audiobook', authenticateToken, audiobookRouter)
  app.use('/api/v1/style', authenticateToken, styleRouter)
  app.use('/api/v1/chapter-review', authenticateToken, chapterReviewRouter)
  app.use('/api/v1/telegram', authenticateToken, telegramRouter)
  app.use('/api/v1/onboarding', authenticateToken, onboardingRouter)
  app.use('/api/v1/chapter-images', authenticateToken, chapterImagesRouter)
  app.use('/api/v1/game', authenticateToken, gameRouter)
  app.use('/api/v1/notifications', authenticateToken, notificationRoutes)
  app.use('/api/v1/memos', authenticateToken, memosRouter)
  app.use('/api/v1/free-stories', authenticateToken, freeStoriesRouter)

  app.use('/api/v1/payments', authenticateToken, requireScope(), paymentsRouter)
  app.use('/api/v1/user', authenticateToken, requireScope(), userRouter)
  app.use('/api/v1/refunds', authenticateToken, requireScope(), refundsRouter)

  app.use('/api/v1/admin', authenticateToken, requireAdmin, adminRouter)
}

// Re-export for WebSocket handler access
export { handleTelnyxMediaStream } from './telnyxCall.js'
