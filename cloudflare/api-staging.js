/** Native D1 vertical slice. Local/staging only; unsupported features fail explicitly. */
import { ApiError, json } from './api/errors.js'
import { verifyToken, requireFullScope } from './api/auth.js'
import { createRepositories } from './api/repositories.js'
import { readJson, validate } from './api/request.js'
import { handlePublicAuth } from './api/auth-routes.js'
import { handlePhotoRequest } from './api/photos.js'
import { handleAccountRoutes } from './api/account.js'
import { storySchemas } from '../services/api/schemas/index.js'
import { getPublicProducts } from '../packages/shared/payment-catalog.js'

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
      if (path === '/payments/products' && method === 'GET') return json(getPublicProducts())
      if (!env.DB) throw new ApiError(503, { error: 'Database not available' })
      if (env.SOURCE_TIMESTAMP_TIMEZONE !== 'UTC')
        throw new ApiError(503, { error: 'Source timestamp interpretation has not been verified' })
      if (path === '/health' && method === 'GET') {
        await env.DB.prepare('SELECT 1').first()
        return json({ status: 'staging', nativeSlice: 'stories', productionReady: false })
      }
      const db = env.DB.withSession('first-primary')
      const publicAuth = await handlePublicAuth({ request, env, db, path, now })
      if (publicAuth) return publicAuth
      if (path.startsWith('/auth/') && !['/auth/me', '/auth/logout'].includes(path))
        throw new ApiError(501, { error: 'Endpoint has not been migrated', code: 'NOT_MIGRATED' })
      const token = await verifyToken(request, env.JWT_SECRET, now)
      const repository = createRepositories(db, {
        wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE
      })
      const identity = await repository.authenticate(token)
      if (!identity || identity.revoked) throw new ApiError(401, { error: 'Token revoked' })
      const { claims } = token
      const { user } = identity
      if (/^\/(payments|user|refunds|admin)(?:\/|$)/.test(path)) requireFullScope(claims)
      const photoResponse = await handlePhotoRequest({ request, env, db, user, path, now })
      if (photoResponse) return photoResponse
      const accountResponse = await handleAccountRoutes({
        request,
        path,
        db,
        claims,
        wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE,
        readJson,
        validate
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
  }
}
