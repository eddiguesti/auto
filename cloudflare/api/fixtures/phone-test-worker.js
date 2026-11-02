// Local synthetic-provider entrypoint; no deployment config references it.
import { PhoneSession } from '../../phone/session.js'
import { handleTelnyxRoutes, handleTelnyxPublicRoutes } from '../telnyx.js'
import { verifyToken } from '../auth.js'
import { ApiError, json } from '../errors.js'
import { appendPhoneTranscript, finalizePhoneInterview } from '../../phone/repository.js'
import {
  enqueueScheduledTopicCall,
  processPhoneMaintenance,
  cancelPhoneInterviewsForUser
} from '../../phone/calls.js'
export class TestPhoneSession extends PhoneSession {
  async recheck() {
    await this.alarm()
  }
  async finishTest() {
    await this.chain
    await this.finish(null)
  }
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/^\/api/, '')
    const db = env.DB.withSession('first-primary')
    try {
      if (path === '/__test__/provider')
        return env.VOICE_PROVIDER.fetch('https://fake.invalid/messages')
      if (path.startsWith('/__test__/')) {
        const body = await request.json()
        if (path === '/__test__/append')
          return json(await appendPhoneTranscript(db, body.id, body.eventId, body.value, body.now))
        if (path === '/__test__/finalize') {
          await finalizePhoneInterview(db, body.id, body.now)
          return json({ ok: true })
        }
        if (path === '/__test__/recheck') {
          await env.PHONE_SESSIONS.getByName(body.id).recheck()
          return json({ ok: true })
        }
        if (path === '/__test__/finish') {
          await env.PHONE_SESSIONS.getByName(body.id).finishTest()
          return json({ ok: true })
        }
        if (path === '/__test__/schedule') return json(await enqueueScheduledTopicCall(env, body))
        if (path === '/__test__/maintenance')
          return json(await processPhoneMaintenance(env, body.now))
        if (path === '/__test__/cancel')
          return json({ count: await cancelPhoneInterviewsForUser(db, body.userId, body.now) })
      }
      const publicResult = await handleTelnyxPublicRoutes({ request, env, db, path })
      if (publicResult) return publicResult
      const token = await verifyToken(request, env.JWT_SECRET)
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
        .bind(token.claims.id)
        .first()
      if (!user) throw new ApiError(401, { error: 'Account unavailable' })
      return (
        (await handleTelnyxRoutes({ request, env, db, path, user, claims: token.claims })) ||
        json({ error: 'Unknown' }, 404)
      )
    } catch (error) {
      if (error instanceof ApiError) return json(error.body, error.status)
      console.error(error)
      return json({ error: 'Test worker failed' }, 500)
    }
  }
}
