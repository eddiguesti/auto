/** Native D1 vertical slice. Local/staging only; unsupported features fail explicitly. */
import { ApiError, json } from './api/errors.js'
import { verifyToken, requireFullScope } from './api/auth.js'
import { createRepositories } from './api/repositories.js'
import { readJson, validate } from './api/request.js'
import { handlePublicAuth, handleAuthenticatedAuth } from './api/auth-routes.js'
import { handlePhotoRequest } from './api/photos.js'
import { handleAccountRoutes } from './api/account.js'
import { handleVoiceUploads } from './api/voice-uploads.js'
import { processMediaDeletionJobs } from './api/media-deletion.js'
import {
  handlePaymentRoutes,
  handleStripeWebhook,
  getNativePublicProducts
} from './api/payments.js'
import { handleRefundRoutes } from './api/refunds.js'
import { handleWritingRoutes } from './api/writing.js'
import { processStyleJob } from './api/writing-style.js'
import { handleVoiceUpgrade, handlePublicVoice, handleVoiceRoutes } from './api/voice.js'
import { handleVoiceQueue, dispatchPendingVoiceCompilations } from './api/voice-compilation.js'
import { consumeGenerationQueue, publishGenerationOutbox } from './jobs/consumer.js'
import { handlePrivacyRoutes } from './api/privacy.js'
import { handlePublishingRoutes } from './api/publishing.js'
import { handleMagicExchange, handleMagicRoutes } from './api/magic-routes.js'
import { handleNativeGame } from './api/game.js'
import { processNativeGameOutbox } from './api/game-core.js'
import { handleNativePrint } from './api/print.js'
import { serveNativePrintFile } from './api/print-files.js'
import { consumePrintQueue, publishPrintOutbox } from './api/print-jobs.js'
import { handleNativeArtwork, enqueueNativeArtwork } from './api/artwork.js'
import { consumeArtworkQueue, publishArtworkOutbox } from './api/artwork-jobs.js'
import { handleTelnyxPublicRoutes, handleTelnyxRoutes } from './api/telnyx.js'
import { processPhoneMaintenance } from './phone/calls.js'
import { runNativeMaintenance } from './api/maintenance.js'
import { handlePublicOps, handleAdminOps } from './api/ops.js'
import { reconcileNativeRefunds } from './api/ops-refunds.js'
import { maintainNativeOps } from './api/ops.js'
import { handleTelegramWebhook, handleTelegramRoutes } from './api/telegram.js'
import { handleNewsletter } from './api/newsletter.js'
import { handleNotificationOptout, handleNotificationRoutes } from './api/notifications.js'
import { processTelegramInbox } from './notifications/telegram-processing.js'
import {
  generateNativeNotifications,
  cleanupNativeNotifications
} from './notifications/schedule.js'
import { deliverNativeNotifications } from './notifications/outbox.js'
export { VoiceSession } from './api/voice-sessions.js'
export { PhoneSession } from './phone/session.js'
import { storySchemas } from '../services/api/schemas/index.js'

function checkPremium(user, chapterId, now) {
  if (
    chapterId !== 'earliest-memories' &&
    (!user.premium_until || new Date(user.premium_until).getTime() <= now)
  ) {
    throw new ApiError(403, { error: 'Premium required', code: 'PREMIUM_REQUIRED' })
  }
}

export default {
  async fetch(request, env) {
    try {
      if (env.NATIVE_API_STAGE !== 'local-d1-slice')
        throw new ApiError(503, { error: 'Native API is not enabled for this environment' })
      const pathname = new URL(request.url).pathname
      const prefix = pathname.startsWith('/api/v1/') ? '/api/v1' : '/api'
      if (!pathname.startsWith(`${prefix}/`)) throw new ApiError(404, { error: 'Not found' })
      const path = pathname.slice(prefix.length).replace(/\/$/, '')
      const method = request.method
      const now = Date.now()
      if (path === '/payments/products' && method === 'GET')
        return json(getNativePublicProducts(env))
      if (!env.DB) throw new ApiError(503, { error: 'Database not available' })
      if (env.SOURCE_TIMESTAMP_TIMEZONE !== 'UTC')
        throw new ApiError(503, { error: 'Source timestamp interpretation has not been verified' })
      if (path === '/health' && method === 'GET') {
        await env.DB.prepare('SELECT 1').first()
        return json({ status: 'staging', nativeSlice: 'stories', productionReady: false })
      }
      const db = env.DB.withSession('first-primary')
      const publicOps = await handlePublicOps({ request, env, db, path, now })
      if (publicOps) return publicOps
      const telegramWebhook = await handleTelegramWebhook({ request, env, db, path, now })
      if (telegramWebhook) return telegramWebhook
      const newsletterResponse = await handleNewsletter({ request, env, db, path, now })
      if (newsletterResponse) return newsletterResponse
      const optoutResponse = await handleNotificationOptout({ request, env, db, path, now })
      if (optoutResponse) return optoutResponse
      const phonePublic = await handleTelnyxPublicRoutes({ request, env, db, path, now })
      if (phonePublic) return phonePublic
      const signedPrintFile = await serveNativePrintFile({ request, env, db, path, now })
      if (signedPrintFile) return signedPrintFile
      const voiceUpgrade = await handleVoiceUpgrade({ request, env, db, path, now })
      if (voiceUpgrade) return voiceUpgrade
      const publicVoice = await handlePublicVoice({ request, env, db, path, now })
      if (publicVoice) return publicVoice
      if (path === '/webhooks/stripe' && method === 'POST')
        return await handleStripeWebhook({ request, env, db, now })
      const magicExchange = await handleMagicExchange({ request, env, db, path, now })
      if (magicExchange) return magicExchange
      const publicAuth = await handlePublicAuth({ request, env, db, path, now })
      if (publicAuth) return publicAuth
      if (
        path.startsWith('/auth/') &&
        !['/auth/me', '/auth/logout', '/auth/resend-verification'].includes(path)
      )
        throw new ApiError(501, { error: 'Endpoint has not been migrated', code: 'NOT_MIGRATED' })
      const token = await verifyToken(request, env.JWT_SECRET, now)
      const repository = createRepositories(db, {
        wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE
      })
      const identity = await repository.authenticate(token)
      if (!identity || identity.revoked) throw new ApiError(401, { error: 'Token revoked' })
      const { claims } = token
      const { user } = identity
      const magicResponse = await handleMagicRoutes({
        request,
        env,
        db,
        path,
        now,
        user,
        claims,
        token
      })
      if (magicResponse) return magicResponse
      if (claims.scope && path !== '/auth/logout') requireFullScope(claims)
      const authenticatedAuth = await handleAuthenticatedAuth({
        request,
        env,
        db,
        path,
        now,
        user,
        claims
      })
      if (authenticatedAuth) return authenticatedAuth
      if (/^\/(payments|user|refunds|admin)(?:\/|$)/.test(path)) requireFullScope(claims)
      const adminResponse = await handleAdminOps({ request, env, db, path, user, claims, now })
      if (adminResponse) return adminResponse
      const telegramResponse = await handleTelegramRoutes({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (telegramResponse) return telegramResponse
      const notificationResponse = await handleNotificationRoutes({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (notificationResponse) return notificationResponse
      const paymentResponse = await handlePaymentRoutes({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (paymentResponse) return paymentResponse
      const refundResponse = await handleRefundRoutes({ request, env, db, path, user, claims, now })
      if (refundResponse) return refundResponse
      const phoneResponse = await handleTelnyxRoutes({ request, env, db, path, user, claims, now })
      if (phoneResponse) return phoneResponse
      const voiceUploadResponse = await handleVoiceUploads({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (voiceUploadResponse) return voiceUploadResponse
      const voiceResponse = await handleVoiceRoutes({ request, env, db, path, user, claims, now })
      if (voiceResponse) return voiceResponse
      const writingResponse = await handleWritingRoutes({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (writingResponse) return writingResponse
      const publishingResponse = await handlePublishingRoutes({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (publishingResponse) return publishingResponse
      const gameResponse = await handleNativeGame({ request, env, db, path, user, claims, now })
      if (gameResponse) return gameResponse
      const printResponse = await handleNativePrint({ request, env, db, path, user, claims, now })
      if (printResponse) return printResponse
      const artworkResponse = await handleNativeArtwork({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (artworkResponse) return artworkResponse
      const privacyResponse = await handlePrivacyRoutes({
        request,
        env,
        db,
        path,
        user,
        claims,
        now
      })
      if (privacyResponse) return privacyResponse
      const photoResponse = await handlePhotoRequest({ request, env, db, user, path, now })
      if (photoResponse) return photoResponse
      const accountResponse = await handleAccountRoutes({
        request,
        path,
        db,
        openExportSession: () => env.DB.withSession('first-primary'),
        claims,
        wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE,
        readJson,
        validate,
        enqueueOnboardingArtwork:
          env.MEDIA && env.ARTWORK_QUEUE && env.GROK_API_KEY
            ? () =>
                enqueueNativeArtwork({ db, userId: claims.id, chapterId: 'earliest-memories', now })
            : null
      })
      if (accountResponse) return accountResponse
      if (path === '/auth/me' && method === 'GET')
        return json({
          user: {
            ...user,
            isPremium: user.premium_until && new Date(user.premium_until).getTime() > now
          }
        })
      if (path === '/auth/logout' && method === 'POST') {
        await repository.revokeToken(token)
        return json({ success: true, message: 'Logged out successfully' })
      }
      if (path === '/stories/all' && method === 'GET')
        return json(await repository.findStories(claims.id))
      if (path === '/stories/progress' && method === 'GET')
        return json(await repository.getProgress(claims.id))
      if (path === '/stories/settings' && method === 'GET')
        return json((await repository.getSettings(claims.id)) || {})
      if (path === '/stories/settings' && method === 'POST') {
        const { name } = validate(await readJson(request), storySchemas.saveSettings.body)
        await repository.saveSettings(claims.id, name)
        return json({ success: true })
      }
      if (path === '/stories' && method === 'POST') {
        const body = validate(await readJson(request), storySchemas.saveStory.body)
        checkPremium(user, body.chapter_id, now)
        const id = await repository.saveStory(claims.id, {
          chapterId: body.chapter_id,
          questionId: body.question_id,
          answer: body.answer,
          totalQuestions: body.total_questions
        })
        if (!id) throw new ApiError(403, { error: 'Premium required', code: 'PREMIUM_REQUIRED' })
        return json({ success: true, id })
      }
      const chapter = /^\/stories\/([^/]+)$/.exec(path)
      if (chapter && method === 'GET') {
        let decoded
        try {
          decoded = decodeURIComponent(chapter[1])
        } catch {
          throw new ApiError(400, {
            error: 'Validation failed',
            message: 'params: chapterId must be a valid slug'
          })
        }
        const { chapterId } = validate(
          { chapterId: decoded },
          storySchemas.getChapter.params,
          'params'
        )
        checkPremium(user, chapterId, now)
        return json(await repository.findStories(claims.id, chapterId))
      }
      throw new ApiError(501, { error: 'Endpoint has not been migrated', code: 'NOT_MIGRATED' })
    } catch (error) {
      if (String(error.message).includes('REFUND_WORK_PENDING'))
        return json(
          {
            error: 'A refund is pending for this purchase. Please contact support before printing.',
            code: 'REFUND_WORK_PENDING'
          },
          409
        )
      if (error instanceof ApiError) {
        const response = json(error.body, error.status)
        if (error.status === 429 && Number.isInteger(error.body.retryAfter))
          response.headers.set('Retry-After', String(error.body.retryAfter))
        return response
      }
      // Fail closed without leaking schema, credentials or memoir content.
      console.error('Native staging API failed', { name: error.name })
      return json({ error: 'Service unavailable' }, 503)
    }
  },
  async scheduled(event, env) {
    if (env.NATIVE_API_STAGE !== 'local-d1-slice' || env.SOURCE_TIMESTAMP_TIMEZONE !== 'UTC')
      throw new Error('Native scheduled environment not configured')
    const now = event.scheduledTime
    await runNativeMaintenance(
      env,
      [
        ['generation-outbox', () => publishGenerationOutbox(env)],
        ['voice-compilation', () => dispatchPendingVoiceCompilations(env)],
        ['story-effects', () => processNativeGameOutbox(env, now)],
        ['print-outbox', () => publishPrintOutbox(env, now)],
        ['artwork-outbox', () => publishArtworkOutbox(env, now)],
        ['phone-maintenance', () => processPhoneMaintenance(env, now)],
        [
          'notification-maintenance',
          async () => {
            await generateNativeNotifications(env, now)
            await processTelegramInbox(env, now)
            await deliverNativeNotifications(env, now)
            await cleanupNativeNotifications(env, now)
          }
        ],
        ['refund-reconciliation', () => reconcileNativeRefunds(env, now)],
        ['operations-retention', () => maintainNativeOps(env, now)],
        [
          'private-media-cleanup',
          () => processMediaDeletionJobs(env, now),
          result => result.failed > 0
        ]
      ],
      now
    )
  },
  async queue(batch, env) {
    if (env.NATIVE_API_STAGE !== 'local-d1-slice' || env.SOURCE_TIMESTAMP_TIMEZONE !== 'UTC')
      throw new Error('Native queue environment not configured')
    if (batch.queue === env.VOICE_COMPILE_QUEUE_NAME) await handleVoiceQueue(batch, env)
    else if (batch.queue === env.GENERATION_QUEUE_NAME)
      await consumeGenerationQueue(batch, env, { styleProcessor: processStyleJob })
    else if (batch.queue === env.PRINT_QUEUE_NAME) await consumePrintQueue(batch, env)
    else if (batch.queue === env.ARTWORK_QUEUE_NAME) await consumeArtworkQueue(batch, env)
    else throw new Error('Unknown queue')
  }
}
