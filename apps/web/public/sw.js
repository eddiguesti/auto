/** Public SPA shell and explicitly public assets only. Private memoir data stays on the network. */
const CACHE_VERSION = 'v3'
const CACHE_PREFIX = 'easy-memoir-'
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`
const PUBLIC_ASSETS = new Set([
  '/site.webmanifest',
  '/book.svg',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/og-image.jpg'
])

function mayCache(response) {
  return (
    response.ok &&
    response.type !== 'opaque' &&
    !/(?:^|,)\s*(?:private|no-store|no-cache)(?:\s|,|=|$)/i.test(
      response.headers.get('cache-control') || ''
    ) &&
    response.headers.get('vary') !== '*'
  )
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      const response = await fetch(
        new Request(new URL('/', self.location.origin), { credentials: 'omit', cache: 'reload' })
      )
      if (mayCache(response) && response.headers.get('content-type')?.includes('text/html'))
        await cache.put('/', response.clone())
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(
            key => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE && key !== SHELL_CACHE
          )
          .map(key => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    request.headers.has('authorization')
  )
    return
  // Query parameters may carry private download/session identifiers, even on asset-like URLs.
  if (url.search) return
  const immutableAsset =
    /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/.test(
      url.pathname
    )
  if (immutableAsset || PUBLIC_ASSETS.has(url.pathname)) {
    event.respondWith(publicAsset(request, immutableAsset))
    return
  }
  if (request.mode === 'navigate') event.respondWith(navigate(request, url))
  // Arbitrary same-origin media, exports and extension-looking private URLs are not intercepted.
})

async function publicAsset(request, immutable) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (immutable && cached && mayCache(cached)) return cached
  try {
    const response = await fetch(request)
    if (mayCache(response)) await cache.put(request, response.clone())
    else await cache.delete(request)
    return response
  } catch {
    return cached && mayCache(cached) ? cached : new Response('Offline', { status: 503 })
  }
}

async function navigate(request, url) {
  try {
    const response = await fetch(request)
    // Only the root public HTML shell is stored; never retain /home, account pages or callback URLs.
    if (url.pathname === '/') {
      const cache = await caches.open(SHELL_CACHE)
      if (mayCache(response) && response.headers.get('content-type')?.includes('text/html'))
        await cache.put('/', response.clone())
      else await cache.delete('/')
    }
    return response
  } catch {
    const shell = await (await caches.open(SHELL_CACHE)).match('/')
    return shell && mayCache(shell) ? shell : new Response('Offline', { status: 503 })
  }
}
