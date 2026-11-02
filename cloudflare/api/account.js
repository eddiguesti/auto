import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import {
  createMappedCodec,
  decodeJsonForApi,
  timestampForStorage,
  timestampToApi
} from './value-codecs.js'
import { validateData } from '../../services/api/middleware/validate.js'
import { onboardingSchemas, userSchemas } from '../../services/api/schemas/index.js'
import mapping from '../db/mapping.json' with { type: 'json' }

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

// These are the same owned groups as the Node personal-data export. Every table
// has a unique id, including the UUID-keyed upload/print tables. Authentication
// credentials, bearer tokens and global operational data are not exported.
const EXPORT_GROUPS = [
  ['stories', 'stories'],
  ['chapterReviews', 'chapter_reviews'],
  ['freeStories', 'free_stories'],
  ['memos', 'memos'],
  ['voiceUploads', 'voice_uploads'],
  ['voiceSessions', 'voice_sessions', { extras: ['phone_request_id'] }],
  ['phoneCalls', 'telnyx_calls', { extras: ['phone_request_id'] }],
  [
    'photos',
    'photos',
    {
      join: 'LEFT JOIN stories s ON s.id = t.story_id',
      owner: 't.user_id = ? OR (t.user_id IS NULL AND s.user_id = ?)'
    }
  ],
  ['chapterImages', 'chapter_images'],
  ['coverDesigns', 'book_covers'],
  ['settings', 'settings'],
  ['gameProgress', 'user_game_state'],
  ['onboarding', 'user_onboarding'],
  ['stylePreferences', 'user_style_preferences'],
  ['achievements', 'achievements'],
  ['memoryEntities', 'memory_entities'],
  [
    'memoryRelationships',
    'memory_relationships',
    {
      join: 'JOIN memory_entities e ON e.id = t.entity1_id',
      owner: 'e.user_id = ?'
    }
  ],
  [
    'memoryMentions',
    'memory_mentions',
    {
      join: 'JOIN memory_entities e ON e.id = t.entity_id',
      owner: 'e.user_id = ?'
    }
  ],
  ['dailyPrompts', 'daily_prompts'],
  ['familyPrompts', 'family_prompts', { owner: 't.from_user_id = ? OR t.for_user_id = ?' }],
  [
    'familyEncouragements',
    'family_encouragements',
    { owner: 't.from_user_id = ? OR t.for_user_id = ?' }
  ],
  ['circleMemberships', 'memory_circle_members'],
  ['collectionProgress', 'user_collection_progress'],
  ['streakHistory', 'streak_history'],
  [
    'payments',
    'payments',
    { columns: ['id', 'product_id', 'product_type', 'amount', 'currency', 'status', 'created_at'] }
  ],
  ['refundRequests', 'refund_requests'],
  ['printOrders', 'print_orders'],
  ['voiceSamples', 'voice_models', { columns: ['fish_model_id', 'consent_given', 'created_at'] }],
  ['audiobooks', 'audiobooks'],
  ['generatedExports', 'generated_exports'],
  ['audiobookRequests', 'audiobook_generation_requests'],
  ['printEntitlements', 'print_entitlements'],
  ['aiUsage', 'ai_usage'],
  ['ownedCircles', 'memory_circles', { owner: 't.owner_user_id = ?' }],
  [
    'followUps',
    'followups',
    { join: 'JOIN stories s ON s.id = t.story_id', owner: 's.user_id = ?' }
  ],
  ['paymentEvents', 'payments_audit_log'],
  ['notifications', 'notification_queue'],
  [
    'telegramMessages',
    'telegram_messages',
    { join: 'JOIN telegram_users u ON u.id = t.telegram_user_id', owner: 'u.user_id = ?' }
  ],
  [
    'telegramSessions',
    'telegram_sessions',
    { join: 'JOIN telegram_users u ON u.id = t.telegram_user_id', owner: 'u.user_id = ?' }
  ],
  [
    'generationJobs',
    'generation_jobs',
    {
      owner: 't.owner_id = ? AND t.user_id = ?',
      columns: [
        'id',
        'kind',
        'request_key',
        'payload',
        'state',
        'object_key',
        'input_hash',
        'attempts',
        'error_code',
        'created_at',
        'updated_at',
        'completed_at',
        'accounted_at'
      ],
      projection: {
        payload: `CASE t.kind WHEN 'style' THEN json_object('tones',json_extract(t.payload,'$.tones'),'narrative',json_extract(t.payload,'$.narrative'),'authorStyle',json_extract(t.payload,'$.authorStyle'),'maxStoryId',json_extract(t.payload,'$.maxStoryId')) WHEN 'audiobook' THEN json_object('useOwnVoice',json_extract(t.payload,'$.useOwnVoice')) ELSE '{}' END`
      },
      native: true,
      json: ['payload'],
      epochs: ['created_at', 'updated_at', 'completed_at', 'accounted_at']
    }
  ],
  [
    'writingStyleHistory',
    'writing_style_items',
    {
      key: "t.job_id || ':' || CAST(t.source_id AS TEXT)",
      columns: [
        'job_id',
        'source_id',
        'story_id',
        'source_answer',
        'source_original',
        'source_updated_at',
        'state',
        'error_code'
      ],
      native: true,
      timestamps: ['source_updated_at']
    }
  ],
  [
    'writingStyleRuns',
    'writing_style_runs',
    {
      key: 't.job_id',
      columns: ['job_id', 'initialized_at'],
      native: true,
      epochs: ['initialized_at']
    }
  ],
  [
    'artworkJobs',
    'native_artwork_jobs',
    {
      columns: [
        'id',
        'chapter_id',
        'prompt',
        'object_key',
        'state',
        'provider_request_id',
        'attempts',
        'next_attempt_at',
        'error_code',
        'created_at',
        'updated_at'
      ],
      native: true,
      epochs: ['next_attempt_at', 'created_at', 'updated_at']
    }
  ],
  [
    'printDispatch',
    'native_print_dispatch',
    {
      key: 't.order_id',
      columns: [
        'order_id',
        'state',
        'post_started_at',
        'attempts',
        'next_attempt_at',
        'error_code',
        'updated_at'
      ],
      native: true,
      epochs: ['post_started_at', 'next_attempt_at', 'updated_at']
    }
  ],
  [
    'nativeCheckouts',
    'native_checkouts',
    {
      key: 't.stripe_session_id',
      columns: [
        'stripe_session_id',
        'product_id',
        'product_type',
        'amount',
        'currency',
        'state',
        'created_at'
      ],
      native: true,
      timestamps: ['created_at']
    }
  ],
  [
    'storySaveHistory',
    'story_outbox',
    {
      columns: [
        'id',
        'story_id',
        'event_type',
        'payload',
        'state',
        'attempts',
        'created_at',
        'updated_at'
      ],
      native: true,
      json: ['payload'],
      timestamps: ['created_at', 'updated_at']
    }
  ],
  [
    'voiceCompilationJobs',
    'voice_compilation_jobs',
    {
      key: 't.session_id',
      columns: [
        'session_id',
        'version',
        'state',
        'provider_started',
        'not_before',
        'attempts',
        'last_error',
        'updated_at'
      ],
      native: true,
      booleans: ['provider_started'],
      epochs: ['not_before'],
      timestamps: ['updated_at']
    }
  ],
  [
    'gameCompletions',
    'game_completion_claims',
    {
      key: "t.kind || ':' || CAST(t.prompt_id AS TEXT)",
      columns: ['kind', 'prompt_id', 'story_id', 'created_at'],
      native: true,
      timestamps: ['created_at']
    }
  ],
  ['gameShields', 'game_shield_claims', { key: 't.date', columns: ['date'], native: true }],
  [
    'phoneInterviews',
    'phone_interviews',
    {
      columns: [
        'id',
        'request_key',
        'phone_number',
        'prompt_text',
        'chapter_id',
        'question_id',
        'voice_session_id',
        'story_id',
        'source_answer',
        'source_version',
        'state',
        'call_control_id',
        'stream_id',
        'created_at',
        'updated_at',
        'answered_at',
        'ended_at',
        'transcript_bytes',
        'transcript_conflict',
        'finalized',
        'error_code'
      ],
      native: true,
      epochs: ['created_at', 'updated_at', 'answered_at', 'ended_at'],
      timestamps: ['source_version'],
      booleans: ['transcript_conflict', 'finalized']
    }
  ],
  [
    'phoneTranscriptHistory',
    'phone_transcript_events',
    {
      key: 't.seq',
      columns: ['seq', 'request_id', 'event_id', 'transcript', 'created_at'],
      native: true,
      epochs: ['created_at']
    }
  ],
  [
    'notificationJobs',
    'native_notification_jobs',
    {
      owner: `t.user_id = ? OR (t.user_id IS NULL AND t.subscriber_id IN(SELECT n.id FROM newsletter_subscribers n JOIN users u ON lower(u.email)=lower(n.email) WHERE u.id=? AND u.email_verified=1))`,
      columns: [
        'id',
        'queue_id',
        'telegram_user_id',
        'subscriber_id',
        'channel',
        'preference_key',
        'state',
        'first_send_at',
        'next_attempt_at',
        'attempts',
        'provider_id',
        'error_code',
        'created_at',
        'updated_at'
      ],
      native: true,
      epochs: ['first_send_at', 'next_attempt_at', 'created_at', 'updated_at']
    }
  ],
  [
    'telegramAccounts',
    'telegram_users',
    {
      columns: [
        'id',
        'telegram_chat_id',
        'telegram_username',
        'telegram_first_name',
        'telegram_last_name',
        'guest_name',
        'guest_email',
        'is_registered',
        'created_at',
        'updated_at'
      ]
    }
  ],
  [
    'telegramInbox',
    'native_telegram_inbox',
    {
      key: 't.update_id',
      owner: 't.owner_id = ?',
      columns: [
        'update_id',
        'telegram_user_id',
        'message_id',
        'text',
        'state',
        'attempts',
        'error_code',
        'created_at',
        'updated_at'
      ],
      native: true,
      epochs: ['created_at', 'updated_at']
    }
  ],
  [
    'telegramDeliveryState',
    'native_telegram_state',
    {
      key: 't.telegram_user_id',
      join: 'JOIN telegram_users u ON u.id=t.telegram_user_id',
      owner: 'u.user_id = ?',
      columns: ['telegram_user_id', 'last_update_id', 'delivery_blocked'],
      native: true,
      booleans: ['delivery_blocked']
    }
  ],
  [
    'newsletterSubscriptions',
    'newsletter_subscribers',
    {
      join: 'JOIN users u ON lower(u.email)=lower(t.email)',
      owner: 'u.id = ? AND u.email_verified = 1'
    }
  ],
  [
    'newsletterConsent',
    'native_newsletter_consent',
    {
      key: 't.subscriber_id',
      join: 'JOIN newsletter_subscribers n ON n.id=t.subscriber_id JOIN users u ON lower(u.email)=lower(n.email)',
      owner: 'u.id = ? AND u.email_verified=1',
      columns: ['subscriber_id', 'confirmed_at', 'last_confirmation_at'],
      native: true,
      epochs: ['confirmed_at', 'last_confirmation_at']
    }
  ],
  [
    'supportEscalations',
    'native_support_escalations',
    {
      columns: [
        'id',
        'contact_email',
        'contact_name',
        'message',
        'conversation',
        'state',
        'created_at'
      ],
      native: true,
      json: ['conversation'],
      epochs: ['created_at']
    }
  ],
  [
    'premiumGrants',
    'native_admin_premium_grants',
    {
      columns: ['id', 'months', 'expires_at', 'created_at'],
      native: true,
      timestamps: ['expires_at'],
      epochs: ['created_at']
    }
  ],
  [
    'refundAttempts',
    'native_refund_attempts',
    {
      columns: [
        'id',
        'payment_id',
        'refund_request_id',
        'stripe_session_id',
        'payment_intent_id',
        'charge_id',
        'amount',
        'currency',
        'known_premium_until',
        'state',
        'provider_refund_id',
        'error_code',
        'created_at',
        'updated_at'
      ],
      native: true,
      timestamps: ['known_premium_until'],
      epochs: ['created_at', 'updated_at']
    }
  ]
]

function decodeNativeExport(row, options) {
  const value = { ...row }
  for (const entry of Object.values(value))
    if (
      typeof entry === 'number' &&
      (!Number.isFinite(entry) || (Number.isInteger(entry) && !Number.isSafeInteger(entry)))
    )
      throw new TypeError('Invalid native export number')
  for (const name of options.json || [])
    if (value[name] !== null) value[name] = decodeJsonForApi(value[name])
  for (const name of options.epochs || [])
    if (value[name] !== null) {
      if (!Number.isSafeInteger(value[name])) throw new TypeError('Invalid native export timestamp')
      value[name] = new Date(value[name]).toISOString()
    }
  for (const name of options.timestamps || [])
    if (value[name] !== null) value[name] = timestampToApi(value[name], 'timestamp', 'UTC')
  for (const name of options.booleans || [])
    if (value[name] !== null) {
      if (value[name] !== 0 && value[name] !== 1)
        throw new TypeError('Invalid native export boolean')
      value[name] = value[name] === 1
    }
  if (value.kind === 'audiobook' && value.payload)
    value.payload.useOwnVoice = Boolean(value.payload.useOwnVoice)
  return value
}
const EXPORT_PAGE_ROWS = 100
const EXPORT_PAGE_BUDGET = 1024 * 1024
const PROFILE_COLUMNS =
  'u.id, u.email, u.name, u.birth_year, u.avatar_url, u.premium_until, u.email_verified, u.phone_number, u.phone_call_consent, u.contact_preference, u.created_at, u.updated_at'

async function exportAccount({ request, claims, codec, now, openExportSession }) {
  if (typeof openExportSession !== 'function')
    throw new ApiError(503, {
      error: 'Account export requires authoritative per-page access checks.',
      code: 'EXPORT_AUTHORIZATION_UNAVAILABLE'
    })
  let revocationKey = claims.jti
  if (!revocationKey) {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) throw new ApiError(401, { error: 'Authentication required' })
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    )
    revocationKey = `sha256:${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`
  }
  const authorize = db =>
    db
      .prepare(
        `SELECT ${PROFILE_COLUMNS} FROM users u
    WHERE u.id = ? AND u.deleted_at IS NULL AND ? > unixepoch('now')
    AND NOT EXISTS (SELECT 1 FROM token_blacklist t WHERE t.jti = ? AND julianday(
      CASE WHEN substr(t.expires_at, -3) = '+00' THEN substr(t.expires_at, 1, length(t.expires_at) - 3) || 'Z' ELSE t.expires_at END
    ) > julianday('now'))
    AND NOT EXISTS (SELECT 1 FROM user_token_invalidation i WHERE i.user_id = u.id AND unixepoch(
      CASE WHEN substr(i.invalidated_at, -3) = '+00' THEN substr(i.invalidated_at, 1, length(i.invalidated_at) - 3) || 'Z' ELSE i.invalidated_at END
    ) >= ?)`
      )
      .bind(claims.id, claims.exp, revocationKey, claims.iat)
  const checkedBatch = async statements => {
    // A fresh first-primary session is supplied for every page. Authorization and
    // that page's data read run together, not against a stale replica bookmark.
    const session = await openExportSession()
    const results = await session.batch([authorize(session), ...statements(session)])
    const user = results[0].results[0]
    if (!user) throw new ApiError(401, { error: 'Token revoked or account unavailable' })
    return { user: codec('users').decodeRow(user), results: results.slice(1) }
  }
  const scopes = EXPORT_GROUPS.map(([name, table, options = {}]) => {
    const owner = options.owner || 't.user_id = ?'
    return {
      name,
      table,
      options,
      owner,
      key: options.key || 't.id',
      args: Array.from({ length: owner.split('?').length - 1 }, () => claims.id),
      from: `${table} t ${options.join || ''}`
    }
  })
  // Capture all high-water keys in the same authorized transaction. A batch is
  // one binding call, and empty groups need no further database request.
  const initial = await checkedBatch(session =>
    scopes.map(({ from, owner, args, key }) =>
      session.prepare(`SELECT MAX(${key}) AS last_key FROM ${from} WHERE (${owner})`).bind(...args)
    )
  )
  const { user } = initial
  const header = {
    exportDate: now.toISOString(),
    user: {
      ...user,
      birthYear: user.birth_year,
      avatarUrl: user.avatar_url,
      accountCreated: user.created_at
    },
    excluded: ['Password hashes, authentication tokens and internal lease/signing credentials'],
    exportConsistency:
      'Owner-authorized keyset pages; this is not a single point-in-time database snapshot.'
  }
  const encoder = new TextEncoder()
  async function* chunks() {
    yield encoder.encode(JSON.stringify(header).slice(0, -1))
    for (let groupIndex = 0; groupIndex < scopes.length; groupIndex++) {
      const { name, table, options, owner, args, from, key } = scopes[groupIndex]
      yield encoder.encode(`,${JSON.stringify(name)}:[`)
      const lastKey = initial.results[groupIndex].results[0]?.last_key
      if (lastKey !== null && lastKey !== undefined) {
        const columns =
          options.columns ||
          mapping.tables
            .find(candidate => candidate.name === table)
            .columns.map(column => column.name)
            .concat(options.extras || [])
        const selected = columns
          .map(column => `${options.projection?.[column] || `t."${column}"`} AS "${column}"`)
          .join(', ')
        // Estimate the worst-case JSON escaping cost in SQL, before the binding
        // materializes rows. Even long transcripts cannot fill a 100-row page
        // with unbounded text. One large row is streamed by itself, never dropped.
        const rowBytes = columns
          .map(
            column =>
              `COALESCE(length(CAST(t."${column}" AS BLOB)), 0) * 6 + ${JSON.stringify(column).length + 8}`
          )
          .join(' + ')
        let cursor = null
        let comma = false
        while (true) {
          const page = await checkedBatch(session => [
            session
              .prepare(
                `WITH candidates AS (
            SELECT ${selected}, ${key} AS __export_key, (${rowBytes}) AS __export_bytes,
              ROW_NUMBER() OVER (ORDER BY ${key}) AS __export_position
            FROM ${from} WHERE (${owner}) AND (? IS NULL OR ${key} > ?) AND ${key} <= ?
            ORDER BY ${key} LIMIT ${EXPORT_PAGE_ROWS}
          ), budgeted AS (
            SELECT *, SUM(__export_bytes) OVER (ORDER BY __export_key ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __export_total FROM candidates
          ) SELECT * FROM budgeted WHERE __export_total <= ${EXPORT_PAGE_BUDGET} OR __export_position = 1 ORDER BY __export_key`
              )
              .bind(...args, cursor, cursor, lastKey)
          ])
          const rows = page.results[0].results
          if (!rows.length) break
          for (const row of rows) {
            const { __export_key, __export_bytes, __export_position, __export_total, ...record } =
              row
            void __export_bytes
            void __export_position
            void __export_total
            cursor = __export_key
            let decoded
            if (options.native) decoded = decodeNativeExport(record, options)
            else if (options.extras) {
              const base = { ...record },
                extras = {}
              for (const name of options.extras) {
                extras[name] = base[name]
                delete base[name]
              }
              decoded = { ...codec(table).decodeRow(base), ...extras }
            } else decoded = codec(table).decodeRow(record)
            yield encoder.encode(`${comma ? ',' : ''}${JSON.stringify(decoded)}`)
            comma = true
          }
          if (cursor === lastKey) break
        }
      }
      yield encoder.encode(']')
    }
    // Clients must consume valid JSON and this terminal marker. A failed read or
    // revoked identity errors the stream instead of closing a partial JSON file.
    yield encoder.encode(',"exportComplete":true}')
  }
  const iterator = chunks()
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const next = await iterator.next()
        if (next.done) controller.close()
        else controller.enqueue(next.value)
      } catch {
        controller.error(new Error('Account export interrupted. Retry the download.'))
      }
    },
    async cancel() {
      await iterator.return()
    }
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="easy-memoir-account-${now.toISOString().slice(0, 10)}.json"`
    }
  })
}

/** Call only after JWT verification and database revocation checks. */
export async function handleAccountRoutes({
  request,
  path,
  db,
  claims,
  wallClockTimeZone,
  readJson,
  now = new Date(),
  openExportSession,
  enqueueOnboardingArtwork = null
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
    return exportAccount({ request, claims, codec, now, openExportSession })
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
    let artwork = { status: 'unavailable', code: 'ARTWORK_UNAVAILABLE' }
    if (typeof enqueueOnboardingArtwork === 'function') {
      try {
        artwork = { status: 'queued', jobId: await enqueueOnboardingArtwork() }
      } catch {
        console.error('Onboarding artwork could not be queued')
      }
    }
    return json({
      success: true,
      message: 'Onboarding complete.',
      artwork
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
