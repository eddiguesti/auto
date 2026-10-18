import { verifyClientIdentity } from './ingress-identity.js'

// Private service binding only. No browser routes, workers.dev or preview URL.
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      if (
        request.method !== 'POST' ||
        url.hostname !== 'auth-identity.internal' ||
        url.pathname !== '/verify'
      )
        throw new TypeError('Invalid verification request')
      const subject = await verifyClientIdentity(
        request.headers.get('X-EasyMemoir-Client-Identity'),
        request.headers.get('X-EasyMemoir-Auth-Path'),
        env.AUTH_INGRESS_SECRET
      )
      return Response.json({ subject }, { headers: { 'Cache-Control': 'private, no-store' } })
    } catch {
      // Never echo an address/assertion or reveal which validation failed.
      return Response.json(
        { error: 'Client identity unavailable' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      )
    }
  }
}
