import '../api/polyfills.js'
import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import { VoiceSession } from './voiceSession.js'

globalThis.__CLOUDFLARE_BINDINGS__ = env
process.env.DATABASE_URL = env.HYPERDRIVE.connectionString
process.env.RUNTIME_PLATFORM = 'cloudflare'
process.env.REQUIRE_OBJECT_STORAGE = 'true'

const [{ createApp }, { processAudiobookQueueBatch }, { runScheduledTasks }] = await Promise.all([
  import('../api/app.js'),
  import('../api/jobs/audiobookQueue.js'),
  import('../api/cron/runScheduled.js')
])

const { app, db } = createApp({ serveStatic: false, serveDocs: false })
app.listen(3000)
const expressHandler = httpServerHandler({ port: 3000 })

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function allowedOrigin(request, bindings) {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  const requestUrl = new URL(request.url)
  const allowed = [requestUrl.origin, bindings.APP_URL, bindings.FRONTEND_URL].filter(Boolean)
  return allowed.includes(new URL(origin).origin)
}

async function voiceRequest(request, bindings) {
  if (!allowedOrigin(request, bindings)) return new Response('Forbidden', { status: 403 })
  const url = new URL(request.url)
  const ticket = url.searchParams.get('ticket')
  const token = url.searchParams.get('token')
  if (!ticket && !token) return new Response('Unauthorized', { status: 401 })

  const sessionName = ticket || crypto.randomUUID()
  const id = bindings.VOICE_SESSIONS.idFromName(sessionName)
  return bindings.VOICE_SESSIONS.get(id).fetch(request)
}

async function issueLandingVoiceTicket(bindings) {
  if (!bindings.GROK_API_KEY) return json({ error: 'Voice service unavailable' }, { status: 503 })
  const ticket = crypto.randomUUID()
  const id = bindings.VOICE_SESSIONS.idFromName(ticket)
  await bindings.VOICE_SESSIONS.get(id).fetch('https://voice.internal/issue', { method: 'POST' })
  return json({ ticket })
}

export { VoiceSession }

export default {
  async fetch(request, bindings, context) {
    globalThis.__CLOUDFLARE_BINDINGS__ = bindings
    const url = new URL(request.url)

    if (url.pathname === '/api/voice/ws') return voiceRequest(request, bindings)
    if (url.pathname === '/api/landing-voice/session' && request.method === 'POST') {
      return issueLandingVoiceTicket(bindings)
    }

    return expressHandler.fetch(request, bindings, context)
  },

  async queue(batch, bindings) {
    globalThis.__CLOUDFLARE_BINDINGS__ = bindings
    await processAudiobookQueueBatch(batch, db)
  },

  async scheduled(controller, bindings, context) {
    globalThis.__CLOUDFLARE_BINDINGS__ = bindings
    context.waitUntil(runScheduledTasks(controller.scheduledTime))
  }
}
