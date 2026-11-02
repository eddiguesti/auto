// Test-only workerd entrypoint. Never referenced by a deployment configuration.
import api from '../../api-staging.js'
import { VoiceSession } from '../voice-sessions.js'
import { handleVoiceQueue } from '../voice-compilation.js'
export class TestVoiceSession extends VoiceSession {
  async resetTestState() {
    this.stop()
    this.ctx.storage.sql.exec('DELETE FROM voice_tickets')
  }
  async checkAuthorizationNow() {
    await this.alarm()
  }
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname === '/__test__/reset') {
      await env.VOICE_SESSIONS.getByName(url.searchParams.get('subject')).resetTestState()
      return Response.json({ done: true })
    }
    if (url.pathname === '/__test__/recheck') {
      await env.VOICE_SESSIONS.getByName(url.searchParams.get('subject')).checkAuthorizationNow()
      return Response.json({ done: true })
    }
    if (url.pathname === '/__test__/compile') {
      let acknowledged = false
      await handleVoiceQueue(
        {
          messages: [
            {
              body: await request.json(),
              ack() {
                acknowledged = true
              }
            }
          ]
        },
        env
      )
      return Response.json({ acknowledged })
    }
    return api.fetch(request, env, ctx)
  }
}
