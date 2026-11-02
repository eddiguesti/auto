/**
 * Cloudflare frontend entry point. Static assets and the API share one origin,
 * including authenticated uploads, webhook bodies, and voice WebSockets.
 * API is a Worker service binding, never a proxy to the public domain.
 */
import { authenticationRequest, signClientIdentity } from './ingress-identity.js'

function corsOrigin(request, env) {
  try {
    const app = new URL(env.APP_URL)
    if (
      app.protocol === 'https:' &&
      !app.username &&
      !app.password &&
      request.headers.get('Origin') === app.origin
    )
      return app.origin
  } catch {
    /* Unconfigured or foreign origins receive no CORS authority. */
  }
  return null
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const origin = corsOrigin(request, env)
      if (request.method === 'OPTIONS')
        return new Response(null, {
          status: origin ? 204 : 403,
          headers: {
            'Cache-Control': 'no-store',
            Vary: 'Origin',
            ...(origin
              ? {
                  'Access-Control-Allow-Origin': origin,
                  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
                  'Access-Control-Max-Age': '600'
                }
              : {})
          }
        })
      if (!env.API) {
        return Response.json(
          { error: 'API service is not configured' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      let apiRequest = request
      if (authenticationRequest(request) && env.AUTH_INGRESS_MODE) {
        try {
          const assertion = await signClientIdentity(request, env)
          const headers = new Headers(request.headers)
          headers.set('X-EasyMemoir-Client-Identity', assertion)
          apiRequest = new Request(request, { headers })
        } catch {
          return Response.json(
            { error: 'Authentication ingress not configured' },
            {
              status: 503,
              headers: { 'Cache-Control': 'no-store' }
            }
          )
        }
      }
      // Forward the original request for all other routes: consuming it could invalidate
      // Stripe signatures or lose the Upgrade header needed for voice sessions.
      const response = await env.API.fetch(apiRequest)
      if (response.status === 101) return response

      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'no-store')
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('X-Frame-Options', 'DENY')
      headers.set('Referrer-Policy', 'no-referrer')
      if (origin) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.append('Vary', 'Origin')
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    }

    return env.ASSETS.fetch(request)
  }
}
