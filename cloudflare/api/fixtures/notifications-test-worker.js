// Test-only modular entry. Never referenced by a deployment configuration.
import { ApiError, json } from '../errors.js'
import { verifyToken } from '../auth.js'
import { createRepositories } from '../repositories.js'
import { handleNewsletter } from '../newsletter.js'
import { handleTelegramWebhook, handleTelegramRoutes } from '../telegram.js'
import { handleNotificationOptout, handleNotificationRoutes } from '../notifications.js'
import { processTelegramInbox } from '../../notifications/telegram-processing.js'
import {
  generateNativeNotifications,
  cleanupNativeNotifications
} from '../../notifications/schedule.js'
import {
  deliverNativeNotifications,
  enqueueAccountNotification
} from '../../notifications/outbox.js'
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url),
        now = Date.now(),
        db = env.DB.withSession('first-primary')
      if (url.pathname === '/__test__/inbox') return json(await processTelegramInbox(env, now))
      if (url.pathname === '/__test__/generate')
        return json(
          await generateNativeNotifications(env, Number(url.searchParams.get('now')) || now)
        )
      if (url.pathname === '/__test__/cleanup') {
        await cleanupNativeNotifications(env, Number(url.searchParams.get('now')) || now)
        return json({ success: true })
      }
      if (url.pathname === '/__test__/deliver')
        return json(await deliverNativeNotifications(env, now))
      if (url.pathname === '/__test__/deliver-disabled')
        return json(
          await deliverNativeNotifications({ ...env, NOTIFICATION_DELIVERY_ENABLED: 'false' }, now)
        )
      if (url.pathname === '/__test__/deliver-telegram-disabled')
        return json(await deliverNativeNotifications({ ...env, TELEGRAM_ENABLED: 'false' }, now))
      if (url.pathname === '/__test__/enqueue')
        return json({
          queued: await enqueueAccountNotification(env, db, { ...(await request.json()), now })
        })
      const path = url.pathname.replace(/^\/api(?:\/v1)?/, '')
      const context = { request, env, db, path, now }
      for (const handler of [handleTelegramWebhook, handleNewsletter, handleNotificationOptout]) {
        const response = await handler(context)
        if (response) return response
      }
      const token = await verifyToken(request, env.JWT_SECRET, now),
        identity = await createRepositories(db, { wallClockTimeZone: 'UTC' }).authenticate(token)
      if (!identity || identity.revoked) throw new ApiError(401, { error: 'Token revoked' })
      for (const handler of [handleTelegramRoutes, handleNotificationRoutes]) {
        const response = await handler({ ...context, user: identity.user, claims: token.claims })
        if (response) return response
      }
      return json({ error: 'Not found' }, 404)
    } catch (error) {
      if (error instanceof ApiError) {
        const response = json(error.body, error.status)
        if (error.status === 429) response.headers.set('Retry-After', String(error.body.retryAfter))
        return response
      }
      return json({ error: 'Service unavailable' }, 503)
    }
  }
}
