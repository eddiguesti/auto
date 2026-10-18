import { describe, expect, it, vi } from 'vitest'
import { createQueueManager } from '../jobs/queue.js'
import { JOB } from '../jobs/jobNames.js'

function fixture(start = async () => {}) {
  const instances = []
  class Boss {
    constructor(options) {
      this.options = options
      this.start = vi.fn(start)
      this.stop = vi.fn(async () => {})
      this.createQueue = vi.fn(async name => {
        // Match the installed pg-boss 12 public name constraint.
        if (!/^[\w.\-/]+$/.test(name)) throw new Error('Invalid queue name')
      })
      instances.push(this)
    }
    on() {}
  }
  const manager = createQueueManager({
    Boss,
    environment: () => ({ DATABASE_URL: 'postgres://user:pass@example.com/db' })
  })
  return { instances, manager }
}

describe('job queue lifecycle', () => {
  it('shares concurrent initialization and exposes only a fully started queue', async () => {
    let release
    const { instances, manager } = fixture(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const one = manager.getQueue()
    const two = manager.getQueue()
    let resolved = false
    void two.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(false)
    expect(instances).toHaveLength(1)
    release()
    const [first, second] = await Promise.all([one, two])
    expect(first).toBe(second)
    expect(first.start).toHaveBeenCalledOnce()
    expect(first.createQueue.mock.calls.map(call => call[0])).toEqual(Object.values(JOB))
    expect(first.options.ssl).toEqual({ rejectUnauthorized: true })
  })

  it('cleans up failed initialization and retries with a fresh queue', async () => {
    const { instances, manager } = fixture(
      vi.fn().mockRejectedValueOnce(new Error('cannot connect')).mockResolvedValueOnce()
    )
    await expect(manager.getQueue()).rejects.toThrow('cannot connect')
    expect(instances[0].stop).toHaveBeenCalledOnce()
    const current = await manager.getQueue()
    expect(instances).toHaveLength(2)
    expect(current).toBe(instances[1])
  })

  it('waits for initialization before stopping and stops only once', async () => {
    let release
    const { instances, manager } = fixture(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const startup = manager.getQueue()
    const firstStop = manager.stopQueue()
    const secondStop = manager.stopQueue()
    expect(instances[0].stop).not.toHaveBeenCalled()
    release()
    await Promise.all([startup, firstStop, secondStop])
    expect(instances[0].stop).toHaveBeenCalledOnce()
  })
})
