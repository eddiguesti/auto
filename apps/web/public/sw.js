/**
 * Easy Memoir Service Worker
 *
 * Strategy:
 * - Static assets (JS, CSS, images, fonts): cache-first (serve from cache, update in background)
 * - API calls (/api/*): network-only (never cache auth/data responses)
 * - Navigation requests (HTML): network-first with offline fallback to cached shell
 *
 * Cache versioning: bump CACHE_VERSION to force immediate refresh on deploy.
 */

const CACHE_VERSION = 'v2'
const STATIC_CACHE = `easy-memoir-static-${CACHE_VERSION}`
const SHELL_CACHE = `easy-memoir-shell-${CACHE_VERSION}`

// Static assets to cache on install (app shell)
const SHELL_URLS = ['/', '/site.webmanifest']

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  // Remove caches from previous versions
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE && key !== SHELL_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API requests — always go to network
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Never intercept non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Never intercept cross-origin requests (fonts, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    return
  }

  // Static assets (hashed filenames from Vite build): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Navigation requests (HTML pages): network-first, fallback to shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithShellFallback(request))
    return
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, SHELL_CACHE))
})

// ─── Strategies ──────────────────────────────────────────────────────────────

/**
 * Cache-first: serve from cache, fetch and update in background if not cached.
 * Ideal for versioned/hashed assets that never change for a given URL.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}

/**
 * Network-first: try network, fall back to cache.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}

/**
 * Network-first for navigation: try to load the page from network,
 * fall back to the cached app shell (index.html) so the React SPA can render.
 */
async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Return cached page or cached shell (SPA handles routing)
    const cached = await caches.match(request)
    if (cached) return cached

    const shell = await caches.match('/')
    return shell || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true for Vite-generated static assets with content hashes.
 * These are safe to cache forever since Vite changes the URL on rebuild.
 */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/assets/') ||
    pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/) !== null ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/) !== null
  )
}
