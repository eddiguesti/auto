import { runDailyTasks, runEveningReminders, runStreakCheck } from './dailyTasks.js'
import { runWeeklyTasks } from './weeklyTasks.js'
import { processNotificationQueue } from '../services/emailService.js'
import { withCronLock } from './lock.js'

function londonParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

/** Dispatch all schedules due at a UTC timestamp. Locks make overlap harmless. */
export async function runScheduledTasks(scheduledTime = Date.now()) {
  const date = new Date(scheduledTime)
  const london = londonParts(date)
  const tasks = [withCronLock('notification-queue', processNotificationQueue)]

  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
    tasks.push(withCronLock('daily-tasks', runDailyTasks))
  }
  if (london.minute === '00' && london.hour === '18') {
    tasks.push(withCronLock('evening-reminders', runEveningReminders))
  }
  if (london.minute === '00' && london.hour === '23') {
    tasks.push(withCronLock('streak-check', runStreakCheck))
  }
  if (london.weekday === 'Mon' && london.minute === '00' && london.hour === '06') {
    tasks.push(withCronLock('weekly-tasks', runWeeklyTasks))
  }

  return Promise.allSettled(tasks)
}
