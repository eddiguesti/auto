import { timestampForStorage } from './value-codecs.js'

// Independent tasks all get a chance to run. Failure is still reported to the
// platform, and a failed attempt cannot advance its durable success timestamp.
export async function runNativeMaintenance(env, jobs, now = Date.now()) {
  const db = env.DB.withSession('first-primary')
  const stamp = timestampForStorage(now)
  const results = await Promise.allSettled(
    jobs.map(async ([name, run, failed = () => false]) => {
      await db
        .prepare(
          `INSERT INTO cron_health(job_name,last_attempt) VALUES(?,?)
        ON CONFLICT(job_name) DO UPDATE SET last_attempt=excluded.last_attempt`
        )
        .bind(name, stamp)
        .run()
      const result = await run()
      if (failed(result)) throw new Error('Scheduled task reported incomplete work')
      await db
        .prepare('UPDATE cron_health SET last_success=? WHERE job_name=?')
        .bind(stamp, name)
        .run()
      return result
    })
  )
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected' ? [jobs[index][0]] : []
  )
  if (failures.length) throw new Error(`Native maintenance failed: ${failures.join(', ')}`)
  return results.map(result => result.value)
}
