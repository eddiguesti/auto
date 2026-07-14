import '../api/polyfills.js'
import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import { VoiceSession } from './voiceSession.js'

globalThis.__CLOUDFLARE_BINDINGS__ = env
process.env.DATABASE_URL = env.HYPERDRIVE.connectionString
process.env.RUNTIME_PLATFORM = 'cloudflare'
process.env.REQUIRE_OBJECT_STORAGE = 'true'

const [
  { createApp },
  { processAudiobookQueueBatch },
  { processBackgroundQueueBatch },
  { runScheduledTasks }
] = await Promise.all([
  import('../api/app.js'),
  import('../api/jobs/audiobookQueue.js'),
  import('../api/jobs/backgroundQueue.js'),
  import('../api/cron/runScheduled.js')
])

const { app, db } = createApp({ serveStatic: false, serveDocs: false })
app.listen(3000)
const expressHandler = httpServerHandler({ port: 3000 })

function allowedOrigin(request, bindings) {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try {
    const requestUrl = new URL(request.url)
    const allowed = [requestUrl.origin, bindings.APP_URL, bindings.FRONTEND_URL].filter(Boolean)
    return allowed.includes(new URL(origin).origin)
  } catch {
    return false
  }
}

async function voiceRequest(request, bindings) {
  if (!allowedOrigin(request, bindings)) return new Response('Forbidden', { status: 403 })
  const url = new URL(request.url)
  const ticket = url.searchParams.get('ticket')
  if (!ticket) return new Response('Unauthorized', { status: 401 })

  const id = bindings.VOICE_SESSIONS.idFromName(ticket)
  return bindings.VOICE_SESSIONS.get(id).fetch(request)
}

export { VoiceSession }

export default {
  async fetch(request, bindings, context) {
    globalThis.__CLOUDFLARE_BINDINGS__ = bindings
    const url = new URL(request.url)

    if (url.pathname === '/api/voice/ws') return voiceRequest(request, bindings)
    return expressHandler.fetch(request, bindings, context)
  },

  async queue(batch, bindings) {
    globalThis.__CLOUDFLARE_BINDINGS__ = bindings
    if (batch.queue === 'easy-memoir-audiobook') {
      await processAudiobookQueueBatch(batch, db)
    } else {
      await processBackgroundQueueBatch(batch, db)
    }
  },

  async scheduled(controller, bindings, context) {
    globalThis.__CLOUDFLARE_BINDINGS__ = bindings
    context.waitUntil(runScheduledTasks(controller.scheduledTime))
  }
}
