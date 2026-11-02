import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { timestampForStorage } from './value-codecs.js'
import { cancelPhoneInterviewsForUser } from '../phone/calls.js'

// This deployment starts with one-time purchases only. External recurring
// billing and in-flight physical fulfilment must be resolved before erasure.
export async function handlePrivacyRoutes({ request, env, db, path, user, claims, now }) {
  if (path !== '/user/delete-account' || request.method !== 'DELETE') return null
  requireFullScope(claims)
  const external = await db
    .prepare(
      `SELECT 1 AS present WHERE EXISTS(SELECT 1 FROM payments WHERE user_id=? AND stripe_subscription_id IS NOT NULL)
    OR EXISTS(SELECT 1 FROM print_orders WHERE user_id=? AND status IN ('queued','submitting','submitted','review'))
    OR EXISTS(SELECT 1 FROM lulu_orders WHERE user_id=? AND lower(status) NOT IN ('shipped','dispatched','delivered','cancelled','canceled','rejected'))
    OR EXISTS(SELECT 1 FROM native_notification_jobs j WHERE j.user_id=? AND j.state='effect_started' AND j.lease_expires>?)
    OR EXISTS(SELECT 1 FROM native_notification_jobs j JOIN newsletter_subscribers s ON s.id=j.subscriber_id
      JOIN users u ON lower(u.email)=lower(s.email) WHERE u.id=? AND u.email_verified=1 AND j.state='effect_started' AND j.lease_expires>?)`
    )
    .bind(user.id, user.id, user.id, user.id, now, user.id, now)
    .first()
  if (external)
    throw new ApiError(409, {
      error:
        'Please wait for active deliveries to finish, or resolve pending billing and print fulfilment with support before deleting this account.',
      code: 'EXTERNAL_ACCOUNT_WORK_PENDING'
    })
  const stamp = timestampForStorage(now, 'instant')
  const ownedKeys = [
    [
      'SELECT p.filename AS object_key FROM photos p LEFT JOIN stories s ON s.id=p.story_id WHERE p.user_id=? OR (p.user_id IS NULL AND s.user_id=?)',
      [user.id, user.id]
    ],
    ["SELECT 'voices/'||fish_model_id AS object_key FROM voice_models WHERE user_id=?", [user.id]],
    ["SELECT 'audiobooks/'||filename AS object_key FROM audiobooks WHERE user_id=?", [user.id]],
    ['SELECT text_key AS object_key FROM print_orders WHERE user_id=?', [user.id]],
    ['SELECT cover_key AS object_key FROM print_orders WHERE user_id=?', [user.id]],
    ['SELECT object_key FROM voice_uploads WHERE user_id=?', [user.id]],
    [
      "SELECT substr(image_url,length('/api/chapter-images/file/')+1) AS object_key FROM chapter_images WHERE user_id=? AND image_url LIKE '/api/chapter-images/file/%'",
      [user.id]
    ],
    [
      "SELECT CASE WHEN audio_url LIKE '/api/memos/audio/%' THEN 'memos/'||substr(audio_url,18) WHEN audio_url LIKE 'memos/%' THEN audio_url END AS object_key FROM memos WHERE user_id=?",
      [user.id]
    ]
  ]
  // Persist idempotent hangup controls before erasing their owner linkage.
  await cancelPhoneInterviewsForUser(db, user.id, now)
  try {
    await db.batch([
      ...ownedKeys.map(([sql, params]) =>
        db
          .prepare(
            `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
      SELECT object_key,?,? FROM (${sql}) WHERE object_key IS NOT NULL
      ON CONFLICT(object_key) DO NOTHING`
          )
          .bind(stamp, stamp, ...params)
      ),
      db
        .prepare(
          `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
      SELECT object_key,strftime('%Y-%m-%d %H:%M:%f+00',MAX(safe_cleanup_after,?)/1000.0,'unixepoch'),? FROM generation_jobs WHERE owner_id=? AND object_key IS NOT NULL
      ON CONFLICT(object_key) DO UPDATE SET next_attempt_at=MAX(media_deletion_jobs.next_attempt_at,excluded.next_attempt_at)`
        )
        .bind(now, stamp, user.id),
      db
        .prepare(
          `UPDATE generation_jobs SET state='cancelled',payload='{}',lease_token=NULL,lease_until=NULL,error_code='ACCOUNT_DELETED',updated_at=? WHERE owner_id=?`
        )
        .bind(now, user.id),
      // Preserve another owner's mislinked metadata, then remove actual owner data.
      db
        .prepare(
          `UPDATE photos SET story_id=NULL WHERE user_id IS NOT NULL AND user_id<>? AND story_id IN (SELECT id FROM stories WHERE user_id=?)`
        )
        .bind(user.id, user.id),
      db
        .prepare(
          `UPDATE stories SET voice_session_id=NULL WHERE user_id<>? AND voice_session_id IN (SELECT id FROM voice_sessions WHERE user_id=?)`
        )
        .bind(user.id, user.id),
      db
        .prepare(
          `DELETE FROM family_encouragements WHERE for_user_id=? OR from_user_id=? OR related_story_id IN (SELECT id FROM stories WHERE user_id=?)`
        )
        .bind(user.id, user.id, user.id),
      db
        .prepare(
          `DELETE FROM family_prompts WHERE for_user_id=? OR from_user_id=? OR answered_story_id IN (SELECT id FROM stories WHERE user_id=?)`
        )
        .bind(user.id, user.id, user.id),
      db
        .prepare(
          `DELETE FROM daily_prompts WHERE user_id=? OR answer_story_id IN (SELECT id FROM stories WHERE user_id=?)`
        )
        .bind(user.id, user.id),
      db.prepare('DELETE FROM telegram_users WHERE user_id=?').bind(user.id),
      db.prepare('DELETE FROM token_blacklist WHERE user_id=?').bind(user.id),
      db
        .prepare(
          'DELETE FROM newsletter_subscribers WHERE lower(email) IN (SELECT lower(email) FROM users WHERE id=? AND email_verified=1)'
        )
        .bind(user.id),
      db.prepare('DELETE FROM users WHERE id=?').bind(user.id)
    ])
  } catch (error) {
    // Database triggers also guard the race between the initial read and delete.
    if (String(error.message).includes('EXTERNAL_ACCOUNT_WORK_PENDING'))
      throw new ApiError(409, {
        error:
          'An external operation is still in progress. Please try again shortly or contact support.',
        code: 'EXTERNAL_ACCOUNT_WORK_PENDING'
      })
    throw error
  }
  // The database commit is the authority. A failed immediate disconnect cannot
  // turn completed erasure into a reported failure; DO alarms also reject it.
  if (env.VOICE_SESSIONS?.getByName) {
    try {
      await env.VOICE_SESSIONS.getByName(`user:${user.id}`).stop(1008, 'Account deleted')
    } catch {
      console.error('Voice disconnect will retry through session expiry')
    }
  }
  return json({
    success: true,
    mediaCleanup: 'scheduled',
    message: 'Account deleted. Stored media removal is scheduled.'
  })
}
