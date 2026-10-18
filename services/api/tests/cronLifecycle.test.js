import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schedules: [],
  daily: vi.fn(),
  lock: vi.fn((_name, run) => run())
}))
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn((schedule, callback, options) => {
      const handle = { destroy: vi.fn() }
      mocks.schedules.push({ schedule, callback, options, handle })
      return handle
    })
  }
}))
vi.mock('../cron/dailyTasks.js', () => ({
  runDailyTasks: mocks.daily,
  runEveningReminders: vi.fn(),
  runStreakCheck: vi.fn()
}))
vi.mock('../cron/weeklyTasks.js', () => ({ runWeeklyTasks: vi.fn() }))
vi.mock('../services/emailService.js', () => ({ processNotificationQueue: vi.fn() }))
vi.mock('../cron/lock.js', () => ({ withCronLock: mocks.lock }))
import { initializeCronJobs, runScheduledTask } from '../cron/index.js'

beforeEach(async () => {
  await initializeCronJobs().stop()
  mocks.schedules.length = 0
  mocks.daily.mockReset()
})

describe('scheduled runtime lifecycle', () => {
  it('starts schedules only once and preserves UK timezone/DST handling', async () => {
    const first = initializeCronJobs()
    expect(initializeCronJobs()).toBe(first)
    expect(mocks.schedules).toHaveLength(5)
    expect(mocks.schedules[1].options).toEqual({ timezone: 'Europe/London', noOverlap: true })
    expect(mocks.schedules[0].options.timezone).toBe('UTC')
    await first.stop()
    for (const schedule of mocks.schedules) expect(schedule.handle.destroy).toHaveBeenCalledOnce()
  })

  it('waits for in-flight cron work during shutdown', async () => {
    let release
    mocks.daily.mockImplementation(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const cron = initializeCronJobs()
    const running = mocks.schedules[0].callback()
    const stopping = cron.stop()
    let stopped = false
    void stopping.then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)
    release()
    await Promise.all([running, stopping])
    expect(stopped).toBe(true)
  })

  it('rejects unknown scheduled task names instead of silently ignoring a bad dispatch', async () => {
    await expect(runScheduledTask('unknown')).rejects.toThrow('Unknown scheduled task')
  })
})
