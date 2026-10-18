import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { validateData } from '../../services/api/middleware/validate.js'
import { onboardingSchemas, userSchemas } from '../../services/api/schemas/index.js'

function validate(body, schema) {
  // The legacy validator accepts parseInt('1950x'); reject ambiguous years.
  if (
    body.birthYear != null &&
    body.birthYear !== '' &&
    !Number.isInteger(body.birthYear) &&
    !(typeof body.birthYear === 'string' && /^\d{4}$/.test(body.birthYear))
  ) {
    throw new ApiError(400, {
      error: 'Validation failed',
      message: 'body: birthYear must be an integer'
    })
  }
  const result = validateData(body, schema)
  if (!result.valid)
    throw new ApiError(400, {
      error: 'Validation failed',
      message: `body: ${result.errors[0]}`
    })
  return result.data
}

async function exportAccount(db, userId, codec, now) {
  // D1 batches execute as a transaction: the export is a consistent owner snapshot.
  const queries = [
    ['users', 'SELECT email, name, birth_year, avatar_url, created_at FROM users WHERE id = ?'],
    [
      'stories',
      'SELECT chapter_id, question_id, answer, original_answer, style_applied, created_at, updated_at FROM stories WHERE user_id = ? ORDER BY chapter_id, question_id LIMIT 10000'
    ],
    [
      'chapter_images',
      'SELECT chapter_id, image_url, prompt_used, generation_status, created_at FROM chapter_images WHERE user_id = ? LIMIT 1000'
    ],
    [
      'user_game_state',
      'SELECT current_streak, longest_streak, total_memories, daily_prompt_completed_today, game_mode_enabled, created_at, updated_at FROM user_game_state WHERE user_id = ?'
    ],
    [
      'photos',
      'SELECT p.filename, p.original_name, p.caption, COALESCE(s.chapter_id, p.chapter_id) AS chapter_id, p.created_at FROM photos p LEFT JOIN stories s ON p.story_id = s.id WHERE (p.user_id = ? AND (s.id IS NULL OR s.user_id = ?)) OR (p.user_id IS NULL AND s.user_id = ?) LIMIT 5000'
    ],
    [
      'user_onboarding',
      'SELECT input_preference, birth_place, birth_country, birth_year, additional_context, onboarding_completed, created_at FROM user_onboarding WHERE user_id = ?'
    ],
    [
      'user_style_preferences',
      'SELECT tones, narrative, author_style, applied_at, created_at FROM user_style_preferences WHERE user_id = ?'
    ],
    [
      'book_covers',
      'SELECT template_id, title, author, front_cover_url, back_cover_url, color_scheme, created_at FROM book_covers WHERE user_id = ?'
    ],
    [
      'achievements',
      'SELECT achievement_type, achievement_key, achievement_name, achievement_description, earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at DESC LIMIT 1000'
    ],
    [
      'memory_entities',
      'SELECT entity_type, name, description, first_mentioned_chapter, mention_count FROM memory_entities WHERE user_id = ? ORDER BY mention_count DESC LIMIT 5000'
    ]
  ]
  const results = await db.batch(
    queries.map(([table, sql]) =>
      db.prepare(sql).bind(...(table === 'photos' ? [userId, userId, userId] : [userId]))
    )
  )
  const rows = results.map((result, i) =>
    result.results.map(row => codec(queries[i][0]).decodeRow(row))
  )
  const [
    users,
    stories,
    images,
    games,
    photos,
    onboarding,
    styles,
    covers,
    achievements,
    entities
  ] = rows
  const user = users[0]
  if (!user) throw new ApiError(404, { error: 'User not found' })
  return {
    exportDate: now.toISOString(),
    user: {
      email: user.email,
      name: user.name,
      birthYear: user.birth_year,
      avatarUrl: user.avatar_url,
      accountCreated: user.created_at
    },
    stories: stories.map(s => ({
      chapterId: s.chapter_id,
      questionId: s.question_id,
      answer: s.answer,
      originalAnswer: s.original_answer,
      styleApplied: s.style_applied,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    })),
    chapterImages: images.map(i => ({
      chapterId: i.chapter_id,
      imageUrl: i.image_url,
      prompt: i.prompt_used,
      status: i.generation_status,
      createdAt: i.created_at
    })),
    photos: photos.map(p => ({
      filename: p.filename,
      originalName: p.original_name,
      caption: p.caption,
      chapterId: p.chapter_id,
      createdAt: p.created_at
    })),
    achievements: achievements.map(a => ({
      type: a.achievement_type,
      key: a.achievement_key,
      name: a.achievement_name,
      description: a.achievement_description,
      earnedAt: a.earned_at
    })),
    memoryEntities: entities.map(e => ({
      type: e.entity_type,
      name: e.name,
      description: e.description,
      firstMentionedChapter: e.first_mentioned_chapter,
      mentionCount: e.mention_count
    })),
    gameProgress: games[0] || null,
    onboarding: onboarding[0] || null,
    stylePreferences: styles[0] || null,
    coverDesign: covers[0] || null
  }
}

/** Call only after JWT verification and database revocation checks. */
export async function handleAccountRoutes({
  request,
  path,
  db,
  claims,
  wallClockTimeZone,
  readJson,
  now = new Date()
}) {
  if (!/^\/(user|onboarding)(?:\/|$)/.test(path)) return null
  if (/^\/user(?:\/|$)/.test(path)) requireFullScope(claims)
  const userId = claims.id
  const method = request.method
  const codec = table => createMappedCodec(table, { wallClockTimeZone })
  const time = timestampForStorage(now)
  const phoneSettings = async () => {
    const row = codec('users').decodeRow(
      await db
        .prepare(
          'SELECT phone_number, phone_call_consent, contact_preference FROM users WHERE id = ?'
        )
        .bind(userId)
        .first()
    )
    return {
      phone_number: row?.phone_number || null,
      phone_call_consent: row?.phone_call_consent || false,
      contact_preference: row?.contact_preference || 'email'
    }
  }
  if (path === '/user/phone-settings' && method === 'GET') return json(await phoneSettings())
  if (path === '/user/phone-settings' && method === 'PUT') {
    const body = validate(await readJson(request), userSchemas.phoneSettings.body)
    await db
      .prepare(
        'UPDATE users SET phone_number = COALESCE(?, phone_number), phone_call_consent = COALESCE(?, phone_call_consent), contact_preference = COALESCE(?, contact_preference), updated_at = ? WHERE id = ?'
      )
      .bind(
        body.phoneNumber || null,
        body.phoneCallConsent === undefined
          ? null
          : codec('users').encode('phone_call_consent', body.phoneCallConsent),
        body.contactPreference || null,
        time,
        userId
      )
      .run()
    return json(await phoneSettings())
  }
  if (path === '/user/export-data' && method === 'GET')
    return json(await exportAccount(db, userId, codec, now))
  if (path === '/user/delete-account' && method === 'DELETE') {
    // Deleting D1 alone would strand private media, third-party voice models and
    // subscriptions. Keep every record until the full cleanup workflow exists.
    throw new ApiError(501, {
      error: 'Account deletion is unavailable during migration. Please contact support.',
      code: 'ACCOUNT_DELETION_NOT_MIGRATED'
    })
  }
  if (path === '/onboarding/status' && method === 'GET') {
    const row = codec('user_onboarding').decodeRow(
      await db
        .prepare(
          'SELECT onboarding_completed, input_preference, birth_place, birth_country, birth_year FROM user_onboarding WHERE user_id = ?'
        )
        .bind(userId)
        .first()
    )
    return json(
      row
        ? {
            completed: row.onboarding_completed,
            preference: row.input_preference,
            birthPlace: row.birth_place,
            birthCountry: row.birth_country,
            birthYear: row.birth_year,
            isNewUser: false
          }
        : { completed: false, isNewUser: true }
    )
  }
  if (path === '/onboarding/preference' && method === 'POST') {
    const { preference } = validate(await readJson(request), {
      preference: { type: 'string', required: true, enum: ['voice', 'type'] }
    })
    await db
      .prepare(
        'INSERT INTO user_onboarding (user_id, input_preference, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET input_preference = excluded.input_preference, updated_at = excluded.updated_at'
      )
      .bind(userId, preference, time, time)
      .run()
    return json({ success: true, preference })
  }
  if (path === '/onboarding/context-form' && method === 'POST') {
    const body = validate(await readJson(request), {
      ...onboardingSchemas.saveContextForm.body,
      birthYear: { ...onboardingSchemas.saveContextForm.body.birthYear, max: now.getUTCFullYear() }
    })
    const statements = []
    if (body.name)
      statements.push(
        db
          .prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
          .bind(body.name, time, userId)
      )
    statements.push(
      db
        .prepare(
          `INSERT INTO user_onboarding (user_id, birth_place, birth_country, birth_year, additional_context, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET birth_place = COALESCE(excluded.birth_place, user_onboarding.birth_place), birth_country = COALESCE(excluded.birth_country, user_onboarding.birth_country), birth_year = COALESCE(excluded.birth_year, user_onboarding.birth_year), additional_context = excluded.additional_context, updated_at = excluded.updated_at`
        )
        .bind(
          userId,
          body.birthPlace || null,
          body.birthCountry || null,
          body.birthYear ?? null,
          codec('user_onboarding').encode(
            'additional_context',
            JSON.stringify({ additionalContext: body.additionalContext || '' })
          ),
          time,
          time
        )
    )
    await db.batch(statements)
    return json({ success: true, userName: body.name || null })
  }
  if (path === '/onboarding/channel-preferences' && method === 'POST') {
    const body = validate(await readJson(request), {
      channels: {
        type: 'array',
        required: true,
        minLength: 1,
        maxLength: 20,
        itemType: 'string',
        itemOpts: { enum: ['phone', 'email', 'telegram', 'app', 'webapp'] }
      }
    })
    const channels = [...new Set(body.channels)]
    await db
      .prepare(
        'INSERT INTO user_onboarding (user_id, channel_preferences, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET channel_preferences = excluded.channel_preferences, updated_at = excluded.updated_at'
      )
      .bind(
        userId,
        codec('user_onboarding').encode('channel_preferences', JSON.stringify(channels)),
        time,
        time
      )
      .run()
    return json({ success: true, channels })
  }
  if (path === '/onboarding/complete' && method === 'POST') {
    await db
      .prepare(
        'INSERT INTO user_onboarding (user_id, onboarding_completed, created_at, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = 1, updated_at = excluded.updated_at'
      )
      .bind(userId, time, time)
      .run()
    return json({
      success: true,
      message: 'Onboarding complete.',
      artwork: { status: 'unavailable', code: 'IMAGE_GENERATION_NOT_MIGRATED' }
    })
  }
  if (path === '/onboarding/reset' && method === 'DELETE') {
    // Reset is atomic and cannot silently abandon existing third-party artwork.
    // Each delete checks the guard inside the same batch transaction; an image
    // created concurrently cannot slip between a preliminary check and deletion.
    const protectedImage =
      'SELECT 1 FROM chapter_images WHERE user_id = ? AND (image_url IS NOT NULL OR generation_status = ?)'
    const results = await db.batch([
      db
        .prepare(`DELETE FROM user_onboarding WHERE user_id = ? AND NOT EXISTS (${protectedImage})`)
        .bind(userId, userId, 'generating'),
      db
        .prepare(`DELETE FROM chapter_images WHERE user_id = ? AND NOT EXISTS (${protectedImage})`)
        .bind(userId, userId, 'generating'),
      db.prepare(`${protectedImage} LIMIT 1`).bind(userId, 'generating')
    ])
    if (results[2].results.length)
      throw new ApiError(503, {
        error: 'Artwork cleanup is unavailable during migration. Your onboarding has been kept.',
        code: 'MEDIA_CLEANUP_UNAVAILABLE'
      })
    return json({ success: true, message: 'Onboarding reset. You can start fresh.' })
  }
  if ((path === '/onboarding/voice-session' || path === '/onboarding/context') && method === 'POST')
    throw new ApiError(501, {
      error: 'Voice onboarding is unavailable during migration. Please use the typing option.',
      code: 'VOICE_ONBOARDING_NOT_MIGRATED'
    })
  return null
}
