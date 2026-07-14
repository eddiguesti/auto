const MAX_PENDING_MESSAGES = 32
const MAX_PENDING_BYTES = 2 * 1024 * 1024
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024
const SESSION_MS = 15 * 60 * 1000

function messageSize(data) {
  if (typeof data === 'string') return new TextEncoder().encode(data).byteLength
  return data?.byteLength ?? data?.size ?? 0
}

/** Coordinates one browser-to-xAI realtime session. */
export class VoiceSession {
  constructor(state, env) {
    this.state = state
    this.env = env
  }

  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/issue' && request.method === 'POST') {
      await this.state.storage.put('ticketContext', {
        expiresAt: Date.now() + 60_000,
        userId: 'anonymous'
      })
      return new Response(null, { status: 204 })
    }
    if (url.pathname === '/issue-auth' && request.method === 'POST') {
      const { userId } = await request.json()
      if (!userId) return new Response('Invalid user', { status: 400 })
      await this.state.storage.put('ticketContext', {
        expiresAt: Date.now() + 60_000,
        userId
      })
      return new Response(null, { status: 204 })
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, browser] = Object.values(pair)
    browser.accept()

    this.state.waitUntil(this.bridge(browser, url))
    return new Response(null, { status: 101, webSocket: client })
  }

  async authorize(url) {
    const ticket = url.searchParams.get('ticket')
    if (ticket) {
      const context = await this.state.storage.get('ticketContext')
      await this.state.storage.delete('ticketContext')
      if (!context?.expiresAt || context.expiresAt < Date.now()) {
        throw new Error('Invalid or expired ticket')
      }
      return { userId: context.userId }
    }

    throw new Error('Unauthorized')
  }

  async bridge(browser, url) {
    let upstream
    let pendingBytes = 0
    const pending = []

    const close = (code = 1011, reason = 'Voice session ended') => {
      try {
        browser.close(code, reason)
      } catch {}
      try {
        upstream?.close(code, reason)
      } catch {}
    }

    const timeout = setTimeout(() => close(1000, 'Session complete'), SESSION_MS)
    browser.addEventListener('close', () => {
      clearTimeout(timeout)
      try {
        upstream?.close(1000, 'Browser disconnected')
      } catch {}
    })
    browser.addEventListener('error', () => close())
    browser.addEventListener('message', event => {
      const size = messageSize(event.data)
      if (size > MAX_MESSAGE_BYTES) return close(1009, 'Message too large')
      if (upstream?.readyState === WebSocket.OPEN) {
        upstream.send(event.data)
      } else if (
        pending.length >= MAX_PENDING_MESSAGES ||
        pendingBytes + size > MAX_PENDING_BYTES
      ) {
        close(1009, 'Too much buffered data')
      } else {
        pending.push(event.data)
        pendingBytes += size
      }
    })

    try {
      await this.authorize(url)
      if (!this.env.GROK_API_KEY) throw new Error('Voice service not configured')

      const response = await fetch('https://api.x.ai/v1/realtime', {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${this.env.GROK_API_KEY}`
        }
      })
      upstream = response.webSocket
      if (!upstream) throw new Error(`xAI WebSocket rejected (${response.status})`)
      upstream.accept()

      upstream.addEventListener('message', event => {
        if (browser.readyState === WebSocket.OPEN) browser.send(event.data)
      })
      upstream.addEventListener('close', event => {
        clearTimeout(timeout)
        if (browser.readyState === WebSocket.OPEN) {
          browser.close(event.code || 1000, event.reason || 'Upstream closed')
        }
      })
      upstream.addEventListener('error', () => close())

      for (const message of pending.splice(0)) upstream.send(message)
      pendingBytes = 0
    } catch (error) {
      console.error('Voice session failed', { error: error.message })
      const authorizationFailure = /unauthorized|ticket/i.test(error.message)
      close(
        authorizationFailure ? 1008 : 1011,
        authorizationFailure ? 'Voice authorization failed' : 'Voice service unavailable'
      )
    }
  }
}
