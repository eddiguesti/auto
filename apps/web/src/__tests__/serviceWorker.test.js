// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, it, expect, vi } from 'vitest'

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://memoir.example'
const keyFor = request => new URL(typeof request === 'string' ? request : request.url, origin).href
function serviceWorker() {
  const listeners = {}
  const stores = new Map()
  const fetch = vi.fn(
    async () =>
      new Response('<html>public shell</html>', {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public' }
      })
  )
  const caches = {
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        match: async request => store.get(keyFor(request))?.clone(),
        put: async (request, response) => store.set(keyFor(request), response.clone()),
        delete: async request => store.delete(keyFor(request))
      }
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name)
  }
  const self = {
    location: { origin },
    addEventListener: (name, handler) => {
      listeners[name] = handler
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() }
  }
  runInNewContext(source, { self, caches, fetch, Request, Response, Headers, URL, Set, Promise })
  const lifecycle = async name => {
    let task
    listeners[name]({
      waitUntil: value => {
        task = value
      }
    })
    await task
  }
  const request = async (path, options = {}) => {
    let task
    listeners.fetch({
      request: {
        url: origin + path,
        method: 'GET',
        mode: 'cors',
        headers: new Headers(),
        ...options
      },
      respondWith: value => {
        task = value
      }
    })
    return task ? await task : null
  }
  return { stores, fetch, caches, self, lifecycle, request }
}

describe('service worker privacy and offline events', () => {
  it('installs only a public HTML shell and will not retain a private/no-store shell', async () => {
    const worker = serviceWorker()
    await worker.lifecycle('install')
    expect(await (await worker.caches.open('easy-memoir-shell-v3')).match('/')).toBeTruthy()
    expect(worker.self.skipWaiting).toHaveBeenCalledOnce()
    const privateWorker = serviceWorker()
    privateWorker.fetch.mockResolvedValue(
      new Response('private user', {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'private, no-store' }
      })
    )
    await privateWorker.lifecycle('install')
    expect(
      await (await privateWorker.caches.open('easy-memoir-shell-v3')).match('/')
    ).toBeUndefined()
  })

  it('does not intercept exact API, API children, private media, signed URLs or authenticated assets', async () => {
    const worker = serviceWorker()
    for (const path of [
      '/api',
      '/api/stories',
      '/photos/alex.jpg',
      '/exports/private.pdf',
      '/unknown.js',
      '/book.svg?token=secret'
    ])
      expect(await worker.request(path)).toBeNull()
    expect(
      await worker.request('/assets/app-ABCDEFGH.js', {
        headers: new Headers({ Authorization: 'Bearer private' })
      })
    ).toBeNull()
    expect(worker.fetch).not.toHaveBeenCalled()
    expect(worker.stores.size).toBe(0)
  })

  it('keeps hashed public assets offline but refuses response cache directives and removes older public copies', async () => {
    const worker = serviceWorker()
    worker.fetch.mockResolvedValue(
      new Response('public asset', { headers: { 'Cache-Control': 'public, max-age=31536000' } })
    )
    await worker.request('/assets/app-ABCDEFGH.js')
    worker.fetch.mockRejectedValue(new Error('offline'))
    expect(await (await worker.request('/assets/app-ABCDEFGH.js')).text()).toBe('public asset')
    worker.fetch.mockResolvedValue(new Response('old public icon'))
    await worker.request('/book.svg')
    worker.fetch.mockResolvedValue(
      new Response('private icon', { headers: { 'Cache-Control': 'private, no-store' } })
    )
    expect(await (await worker.request('/book.svg')).text()).toBe('private icon')
    worker.fetch.mockRejectedValue(new Error('offline'))
    expect((await worker.request('/book.svg')).status).toBe(503)
  })

  it('serves the offline SPA shell without caching member pages or callback parameters', async () => {
    const worker = serviceWorker()
    await worker.lifecycle('install')
    worker.fetch.mockResolvedValue(
      new Response('member page', {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'private' }
      })
    )
    await worker.request('/home', { mode: 'navigate' })
    expect(await (await worker.caches.open('easy-memoir-shell-v3')).match('/home')).toBeUndefined()
    expect(await worker.request('/home?token=secret', { mode: 'navigate' })).toBeNull()
    worker.fetch.mockRejectedValue(new Error('offline'))
    expect(await (await worker.request('/home', { mode: 'navigate' })).text()).toContain(
      'public shell'
    )
  })

  it('activation retires only Easy Memoir caches, preserving unrelated applications', async () => {
    const worker = serviceWorker()
    await worker.caches.open('easy-memoir-static-v2')
    await worker.caches.open('another-app-cache')
    await worker.caches.open('easy-memoir-shell-v3')
    await worker.lifecycle('activate')
    expect(await worker.caches.keys()).toEqual(['another-app-cache', 'easy-memoir-shell-v3'])
    expect(worker.self.clients.claim).toHaveBeenCalledOnce()
  })
})
