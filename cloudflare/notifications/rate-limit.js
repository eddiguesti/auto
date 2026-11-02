import { ApiError } from '../api/errors.js'
import { sha256 } from '../api/auth-rate-limit.js'
export async function reserveNotificationRate(
  db,
  namespace,
  subject,
  now,
  { window = 900, globalMaximum = 120, maximum = 5 } = {}
) {
  const started = Math.floor(now / (window * 1000)) * window,
    globalKey = `notify-rate:${namespace}:global`,
    key = `notify-rate:${namespace}:${await sha256(subject)}`
  const rows = await db.batch([
    db
      .prepare(
        `INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts) VALUES(?,?,1) ON CONFLICT(subject_hash) DO UPDATE SET window_started_at=excluded.window_started_at,attempts=CASE WHEN auth_rate_limits.window_started_at=excluded.window_started_at THEN MIN(auth_rate_limits.attempts+1,?+1) ELSE 1 END RETURNING attempts`
      )
      .bind(globalKey, started, globalMaximum),
    db
      .prepare(
        `INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM auth_rate_limits WHERE subject_hash=? AND window_started_at=? AND attempts<=?) ON CONFLICT(subject_hash) DO UPDATE SET window_started_at=excluded.window_started_at,attempts=CASE WHEN auth_rate_limits.window_started_at=excluded.window_started_at THEN MIN(auth_rate_limits.attempts+1,?+1) ELSE 1 END RETURNING attempts`
      )
      .bind(key, started, globalKey, started, globalMaximum, maximum)
  ])
  if (
    rows[0].results[0].attempts > globalMaximum ||
    !rows[1].results[0] ||
    rows[1].results[0].attempts > maximum
  )
    throw new ApiError(429, {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.max(1, started + window - Math.floor(now / 1000))
    })
}
