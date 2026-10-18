import { describe, it, expect, vi } from 'vitest'
import worker from './web.js'

describe('Cloudflare frontend routing', () => {
  it.each(['/api', '/api/health', '/api/photos/file/family.jpg', '/api/unknown'])(
    'sends %s to the API rather than the SPA',
    async path => {
      const request = new Request(`https://easymemoir.example${path}?test=1`)
      const env = {
        API: { fetch: vi.fn(async () => new Response('api', { status: 404 })) },
        ASSETS: { fetch: vi.fn() }
      }
      const response = await worker.fetch(request, env)
      expect(env.API.fetch).toHaveBeenCalledWith(request)
      expect(env.ASSETS.fetch).not.toHaveBeenCalled()
      expect(response.status).toBe(404)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    }
  )

  it('preserves the signed webhook body and authorization headers', async () => {
    const body = '{"type":"payment_intent.succeeded","data":{"id":1}}'
    const request = new Request('https://easymemoir.example/api/webhooks/stripe', {
      method: 'POST',
      body,
      headers: { 'Stripe-Signature': 't=1,v1=signature', Authorization: 'Bearer token' }
    })
    const env = {
      API: {
        fetch: vi.fn(async original => {
          expect(original).toBe(request)
          expect(original.headers.get('Stripe-Signature')).toBe('t=1,v1=signature')
          expect(original.headers.get('Authorization')).toBe('Bearer token')
          expect(await original.text()).toBe(body)
          return new Response('ok')
        })
      }
    }
    expect((await worker.fetch(request, env)).status).toBe(200)
  })

  it('returns WebSocket upgrades intact', async () => {
    const request = new Request('https://easymemoir.example/api/voice/ws?ticket=abc', {
      headers: { Upgrade: 'websocket' }
    })
    // Node cannot construct a 101 Response. The Worker must return the runtime's
    // upgrade response by identity to preserve its webSocket property.
    const upgrade = { status: 101, webSocket: {} }
    const env = { API: { fetch: vi.fn(async () => upgrade) } }
    expect(await worker.fetch(request, env)).toBe(upgrade)
    expect(env.API.fetch).toHaveBeenCalledWith(request)
  })

  it.each(['/', '/dashboard', '/apiary', '/assets/app.js', '/audio-processor.js'])(
    'serves %s from the asset binding',
    async path => {
      const request = new Request(`https://easymemoir.example${path}`)
      const asset = new Response('asset')
      const env = { ASSETS: { fetch: vi.fn(async () => asset) }, API: { fetch: vi.fn() } }
      expect(await worker.fetch(request, env)).toBe(asset)
      expect(env.ASSETS.fetch).toHaveBeenCalledWith(request)
      expect(env.API.fetch).not.toHaveBeenCalled()
    }
  )

  it('reports a missing backend as JSON instead of returning the SPA', async () => {
    const request = new Request('https://easymemoir.example/api/auth/login')
    const env = { ASSETS: { fetch: vi.fn() } }
    const response = await worker.fetch(request, env)
    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'API service is not configured' })
    expect(env.ASSETS.fetch).not.toHaveBeenCalled()
  })
})
