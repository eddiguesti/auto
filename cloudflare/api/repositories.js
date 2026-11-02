import { createMappedCodec, decodeJsonForApi, timestampForStorage } from './value-codecs.js'

const STORY_COLUMNS =
  's.id, s.user_id, s.chapter_id, s.question_id, s.answer, s.original_answer, s.style_applied, s.style_applied_at, s.created_at, s.updated_at'
const WITH_PHOTOS = `SELECT ${STORY_COLUMNS},
  (SELECT json_group_array(json_object('id', p.id, 'filename', p.filename, 'caption', p.caption))
   FROM photos p WHERE p.story_id = s.id AND (p.user_id IS NULL OR p.user_id = s.user_id)) AS photos
  FROM stories s WHERE s.user_id = ?`

export function createRepositories(db, { wallClockTimeZone, now = () => new Date() } = {}) {
  const storyCodec = createMappedCodec('stories', { wallClockTimeZone })
  const settingsCodec = createMappedCodec('settings', { wallClockTimeZone })
  const userCodec = createMappedCodec('users', { wallClockTimeZone })
  const time = kind => timestampForStorage(now(), kind)
  const decodeStory = row => {
    const { photos, ...story } = row
    return { ...storyCodec.decodeRow(story), photos: decodeJsonForApi(photos) }
  }
  return {
    async authenticate({ claims, revocationKey }) {
      // Run first on the primary via the request's D1 session. Revocation never
      // uses eventually-consistent caches or falls open after a database failure.
      const row = await db
        .prepare(
          `SELECT u.id, u.email, u.name, u.birth_year, u.avatar_url,
          u.premium_until, u.email_verified, u.google_id, u.is_admin,
          EXISTS(SELECT 1 FROM token_blacklist t WHERE t.jti = ? AND julianday(
            CASE WHEN substr(t.expires_at, -3) = '+00' THEN substr(t.expires_at, 1, length(t.expires_at) - 3) || 'Z' ELSE t.expires_at END
          ) > julianday(?)) AS revoked,
          EXISTS(SELECT 1 FROM user_token_invalidation i WHERE i.user_id = u.id AND unixepoch(
            CASE WHEN substr(i.invalidated_at, -3) = '+00' THEN substr(i.invalidated_at, 1, length(i.invalidated_at) - 3) || 'Z' ELSE i.invalidated_at END
          ) >= ?) AS invalidated
        FROM users u WHERE u.id = ? AND u.deleted_at IS NULL`
        )
        .bind(revocationKey, time(), claims.iat, claims.id)
        .first()
      if (!row) return null
      const { revoked, invalidated, ...user } = row
      return { user: userCodec.decodeRow(user), revoked: Boolean(revoked || invalidated) }
    },
    async revokeToken({ claims, revocationKey }) {
      await db
        .prepare(
          `INSERT INTO token_blacklist (jti, user_id, expires_at, revoked_at)
        VALUES (?, ?, ?, ?) ON CONFLICT (jti) DO NOTHING`
        )
        .bind(
          revocationKey,
          claims.id,
          timestampForStorage(new Date(claims.exp * 1000), 'instant'),
          time('instant')
        )
        .run()
    },
    async invalidateUserTokens(userId) {
      await db
        .prepare(
          `INSERT INTO user_token_invalidation (user_id, invalidated_at) VALUES (?, ?)
        ON CONFLICT (user_id) DO UPDATE SET invalidated_at =
          CASE WHEN julianday(CASE WHEN substr(excluded.invalidated_at,-3)='+00' THEN substr(excluded.invalidated_at,1,length(excluded.invalidated_at)-3)||'Z' ELSE excluded.invalidated_at END) > julianday(CASE WHEN substr(user_token_invalidation.invalidated_at,-3)='+00' THEN substr(user_token_invalidation.invalidated_at,1,length(user_token_invalidation.invalidated_at)-3)||'Z' ELSE user_token_invalidation.invalidated_at END)
          THEN excluded.invalidated_at ELSE user_token_invalidation.invalidated_at END`
        )
        .bind(userId, time('instant'))
        .run()
    },
    async findStories(userId, chapterId) {
      const query = `${WITH_PHOTOS}${chapterId === undefined ? '' : ' AND s.chapter_id = ?'} ORDER BY s.chapter_id, s.question_id, s.id`
      const parameters = chapterId === undefined ? [userId] : [userId, chapterId]
      const { results } = await db
        .prepare(query)
        .bind(...parameters)
        .all()
      return results.map(decodeStory)
    },
    async getProgress(userId) {
      const { results } = await db
        .prepare(
          `SELECT chapter_id, COUNT(*) AS answered FROM stories
        WHERE user_id = ? AND answer IS NOT NULL AND answer != '' GROUP BY chapter_id`
        )
        .bind(userId)
        .all()
      return Object.fromEntries(results.map(row => [row.chapter_id, row.answered]))
    },
    async getSettings(userId) {
      return settingsCodec.decodeRow(
        await db
          .prepare(
            'SELECT id, user_id, name, created_at, updated_at FROM settings WHERE user_id = ?'
          )
          .bind(userId)
          .first()
      )
    },
    async saveSettings(userId, name) {
      const timestamp = time()
      await db
        .prepare(
          `INSERT INTO settings (user_id, name, created_at, updated_at)
        SELECT id, ?, ?, ? FROM users WHERE id = ? AND deleted_at IS NULL
        ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`
        )
        .bind(name ?? null, timestamp, timestamp, userId)
        .run()
    },
    async saveStory(userId, { chapterId, questionId, answer, totalQuestions }) {
      const timestamp = time()
      // Raw edits invalidate compiled prose but retain the author's reviewed chapter.
      // Its updated_at comparison marks that review stale for canonical publishing.
      // Core mutation and side-effect intent are one real D1 batch transaction.
      // The outbox consumer is deliberately not implemented/deployed in this slice.
      const permitted = `u.id = ? AND u.deleted_at IS NULL AND
        (? = 'earliest-memories' OR julianday(u.premium_until) > julianday(?))`
      const eventId = crypto.randomUUID()
      const results = await db.batch([
        db
          .prepare(
            `INSERT INTO stories (user_id, chapter_id, question_id, answer, created_at, updated_at)
          SELECT u.id, ?, ?, ?, ?, ? FROM users u WHERE ${permitted}
          ON CONFLICT (user_id, chapter_id, question_id) DO UPDATE SET answer = excluded.answer, compiled_content = NULL, compiled_at = NULL, updated_at = excluded.updated_at
          RETURNING id`
          )
          .bind(
            chapterId,
            questionId,
            answer ?? null,
            timestamp,
            timestamp,
            userId,
            chapterId,
            timestamp
          ),
        db
          .prepare(
            `INSERT INTO story_outbox (id, user_id, story_id, event_type, payload, created_at)
          SELECT ?, s.user_id, s.id, 'story-saved', json_object('storyId', s.id, 'userId', s.user_id,
            'chapterId', s.chapter_id, 'questionId', s.question_id, 'answer', s.answer, 'totalQuestions', ?), ?
          FROM stories s JOIN users u ON u.id = s.user_id
          WHERE s.user_id = ? AND s.chapter_id = ? AND s.question_id = ? AND ${permitted}`
          )
          .bind(
            eventId,
            totalQuestions || 5,
            timestamp,
            userId,
            chapterId,
            questionId,
            userId,
            chapterId,
            timestamp
          )
      ])
      return results[0].results[0]?.id ?? null
    }
  }
}
