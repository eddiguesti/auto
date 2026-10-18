/**
 * Cloudflare frontend entry point. Static assets and the API share one origin,
 * including authenticated uploads, webhook bodies, and voice WebSockets.
 * API is a Worker service binding, never a proxy to the public domain.
 */
import { authenticationPath, signClientIdentity } from './ingress-identity.js'

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      if (!env.API) {
        return Response.json(
          { error: 'API service is not configured' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      let apiRequest = request
      if (request.method === 'POST' && authenticationPath(pathname) && env.AUTH_INGRESS_MODE) {
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
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    }

    return env.ASSETS.fetch(request)
  }
}
