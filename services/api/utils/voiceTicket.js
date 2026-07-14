import crypto from 'crypto'
import { createVoiceTicket } from './voiceProxy.js'

/** Issue a 60-second single-use WebSocket ticket after HTTP authentication. */
export async function issueAuthenticatedVoiceTicket(userId) {
  const bindings = globalThis.__CLOUDFLARE_BINDINGS__
  if (!bindings?.VOICE_SESSIONS) return createVoiceTicket({ userId })

  const ticket = crypto.randomUUID()
  const id = bindings.VOICE_SESSIONS.idFromName(ticket)
  const response = await bindings.VOICE_SESSIONS.get(id).fetch(
    'https://voice.internal/issue-auth',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }
  )
  if (!response.ok) throw new Error('Unable to issue voice ticket')
  return ticket
}

export async function issuePublicVoiceTicket() {
  const bindings = globalThis.__CLOUDFLARE_BINDINGS__
  if (!bindings?.VOICE_SESSIONS) return createVoiceTicket()

  const ticket = crypto.randomUUID()
  const id = bindings.VOICE_SESSIONS.idFromName(ticket)
  const response = await bindings.VOICE_SESSIONS.get(id).fetch('https://voice.internal/issue', {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Unable to issue voice ticket')
  return ticket
}
