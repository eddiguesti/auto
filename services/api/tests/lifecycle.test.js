import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShutdown, registerShutdown } from '../utils/lifecycle.js'
import { EventEmitter } from 'node:events'

afterEach(() => vi.useRealTimers())
const logger = { log: vi.fn(), error: vi.fn() }

describe('runtime shutdown', () => {
  it('drains in-flight work before closing DB, exits successfully once and cancels the deadline', async () => {
    vi.useFakeTimers()
    const order = []
    const exit = vi.fn()
    const shutdown = createShutdown({
      stopCron: () => order.push('cron'),
      closeServer: async () => order.push('server'),
      closeSockets: async () => order.push('sockets'),
      stopQueue: async () => order.push('queue'),
      closeDatabase: async () => order.push('database'),
      exit,
      logger
    })
    const first = shutdown('SIGTERM')
    expect(shutdown('SIGINT')).toBe(first)
    await first
    expect(order[0]).toBe('cron')
    expect(order.at(-1)).toBe('database')
    expect(order).toHaveLength(5)
    await vi.advanceTimersByTimeAsync(20000)
    expect(exit).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('attempts all cleanup after a queue failure and reports a failed exit', async () => {
    const closeDatabase = vi.fn()
    const exit = vi.fn()
    await createShutdown({
      stopQueue: async () => {
        throw new Error('queue failed')
      },
      closeDatabase,
      exit,
      logger
    })()
    expect(closeDatabase).toHaveBeenCalledOnce()
    expect(exit).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('enforces the timeout when a resource never finishes', async () => {
    vi.useFakeTimers()
    const exit = vi.fn()
    const shutdown = createShutdown({
      stopQueue: () => new Promise(() => {}),
      exit,
      logger,
      timeoutMs: 100
    })
    void shutdown()
    await vi.advanceTimersByTimeAsync(100)
    expect(exit).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('registers and removes process signal handlers', () => {
    const target = new EventEmitter()
    const shutdown = vi.fn()
    const remove = registerShutdown(shutdown, target)
    target.emit('SIGTERM')
    expect(shutdown).toHaveBeenCalledWith('SIGTERM')
    remove()
    target.emit('SIGINT')
    expect(shutdown).toHaveBeenCalledOnce()
  })
})
