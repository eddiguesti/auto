// Schedules remain in one registry so the native Cloudflare scheduler can preserve
// Europe/London daylight-saving semantics rather than copying fixed UTC hours.
import cron from 'node-cron'
import { runDailyTasks, runEveningReminders, runStreakCheck } from './dailyTasks.js'
import { runWeeklyTasks } from './weeklyTasks.js'
import { processNotificationQueue } from '../services/emailService.js'
import { withCronLock } from './lock.js'

export const scheduledTasks = Object.freeze([
  { name: 'daily-tasks', schedule: '0 0 * * *', timezone: 'UTC', run: runDailyTasks },
  {
    name: 'evening-reminders',
    schedule: '0 18 * * *',
    timezone: 'Europe/London',
    run: runEveningReminders
  },
  { name: 'streak-check', schedule: '0 23 * * *', timezone: 'Europe/London', run: runStreakCheck },
  { name: 'weekly-tasks', schedule: '0 6 * * 1', timezone: 'Europe/London', run: runWeeklyTasks },
  {
    name: 'notification-queue',
    schedule: '*/15 * * * *',
    timezone: 'UTC',
    run: processNotificationQueue
  }
])

let active = null

export async function runScheduledTask(name) {
  const task = scheduledTasks.find(candidate => candidate.name === name)
  if (!task) throw new Error(`Unknown scheduled task: ${name}`)
  return withCronLock(task.name, task.run)
}

export function initializeCronJobs() {
  if (active) return active
  const running = new Set()
  const tasks = scheduledTasks.map(task =>
    cron.schedule(
      task.schedule,
      async () => {
        const execution = runScheduledTask(task.name)
        running.add(execution)
        try {
          await execution
        } catch (error) {
          console.error(`[CRON] ${task.name} failed:`, error.message)
        } finally {
          running.delete(execution)
        }
      },
      { timezone: task.timezone, noOverlap: true }
    )
  )
  let stopping
  active = {
    stop() {
      if (stopping) return stopping
      for (const task of tasks) task.destroy()
      stopping = Promise.allSettled([...running]).then(() => {
        active = null
      })
      return stopping
    }
  }
  console.log('Cron jobs initialized:', scheduledTasks.map(task => task.name).join(', '))
  return active
}
