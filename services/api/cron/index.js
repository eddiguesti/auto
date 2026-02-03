// /life-story/server/cron/index.js

import cron from 'node-cron';
import { runDailyTasks, runEveningReminders, runStreakCheck } from './dailyTasks.js';
import { runWeeklyTasks } from './weeklyTasks.js';

export function initializeCronJobs() {
  console.log('Initializing cron jobs...');

  // Daily at midnight UTC - Reset daily flags, generate new prompts
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running midnight daily tasks...');
    try {
      await runDailyTasks();
    } catch (err) {
      console.error('[CRON] Daily tasks failed:', err);
    }
  }, { timezone: 'UTC' });

  // Daily at 6pm UK time - Send reminders to users who haven't completed
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Running evening reminders...');
    try {
      await runEveningReminders();
    } catch (err) {
      console.error('[CRON] Evening reminders failed:', err);
    }
  }, { timezone: 'Europe/London' });

  // Daily at 11pm UK time - Check streaks, send warnings
  cron.schedule('0 23 * * *', async () => {
    console.log('[CRON] Running streak check...');
    try {
      await runStreakCheck();
    } catch (err) {
      console.error('[CRON] Streak check failed:', err);
    }
  }, { timezone: 'Europe/London' });

  // Weekly on Monday at 6am - Reset weekly shields, send digests
  cron.schedule('0 6 * * 1', async () => {
    console.log('[CRON] Running weekly tasks...');
    try {
      await runWeeklyTasks();
    } catch (err) {
      console.error('[CRON] Weekly tasks failed:', err);
    }
  }, { timezone: 'Europe/London' });

  console.log('Cron jobs initialized:');
  console.log('  - Midnight UTC: Daily reset');
  console.log('  - 6pm UK: Evening reminders');
  console.log('  - 11pm UK: Streak check');
  console.log('  - Monday 6am UK: Weekly tasks');
}
