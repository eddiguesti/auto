import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

vi.mock('../middleware/auth.js', () => ({ authenticateToken: (_req, _res, next) => next() }))
vi.mock('../utils/gameStateManager.js', () => ({
  recordActivity: vi.fn(async () => {
    throw new Error('Engagement unavailable')
  }),
  syncMemoryCounts: vi.fn()
}))
vi.mock('../services/gameService.js', () => ({
  awardAchievement: vi.fn(),
  checkAndAwardAchievements: vi.fn(),
  updateCollectionProgress: vi.fn()
}))
import userRouter from '../routes/user.js'
import refundsRouter from '../routes/refunds.js'
import circleRouter from '../routes/game/circles.js'
import promptRouter from '../routes/game/circlePrompts.js'
import challengeRouter from '../routes/game/challenges.js'
import { photoRepository } from '../repositories/photoRepository.js'
import { processMediaDeletionJobs } from '../services/mediaDeletion.js'
import { resolveManuscript } from '../services/manuscript.js'

const connection = process.env.TEST_DATABASE_URL
const suite = connection ? describe : describe.skip
suite('real PostgreSQL data ownership, publishing and account deletion', () => {
  let client, server, base, userId, otherId
  const schema = `audit_data_${randomBytes(6).toString('hex')}`
  const db = {
    query: (...args) => client.query(...args),
    connect: async () => ({ query: (...args) => client.query(...args), release() {} })
  }
  beforeAll(async () => {
    client = new pg.Client({ connectionString: connection })
    await client.connect()
    await client.query(`CREATE SCHEMA ${schema}`)
    await client.query(`SET search_path TO ${schema}`)
    const directory = new URL('../db/migrations/', import.meta.url)
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
      await client.query(await readFile(new URL(name, directory), 'utf8'))
    }
    const app = express()
    app.locals.db = db
    app.use(express.json(), (req, _res, next) => {
      req.user = { id: userId, email: 'owner@example.com' }
      next()
    })
    app.use('/user', userRouter)
    app.use('/refunds', refundsRouter)
    app.use('/game', circleRouter, promptRouter, challengeRouter)
    app.use((error, _req, res, _next) =>
      res.status(error.statusCode || 500).json({ error: error.message })
    )
    server = await new Promise(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
    })
    base = `http://127.0.0.1:${server.address().port}`
  }, 30000)
  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    if (client) {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      await client.end()
    }
  })
  beforeEach(async () => {
    await client.query('TRUNCATE users, media_deletion_jobs RESTART IDENTITY CASCADE')
    userId = (
      await client.query(
        "INSERT INTO users(email,name) VALUES('owner@example.com','Owner') RETURNING id"
      )
    ).rows[0].id
    otherId = (
      await client.query(
        "INSERT INTO users(email,name) VALUES('other@example.com','Other') RETURNING id"
      )
    ).rows[0].id
  })
  const post = (path, body) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  it('allows only the owner to retrieve an analysed photo without a story', async () => {
    const photo = (
      await client.query(
        "INSERT INTO photos(user_id,filename) VALUES($1,'private.jpg') RETURNING id",
        [userId]
      )
    ).rows[0]
    expect(await photoRepository.findByFilenameForUser(db, 'private.jpg', userId)).toMatchObject(
      photo
    )
    expect(await photoRepository.findByIdForUser(db, photo.id, userId)).toMatchObject(photo)
    expect(await photoRepository.findByFilenameForUser(db, 'private.jpg', otherId)).toBeNull()
    expect(await photoRepository.findByIdForUser(db, photo.id, otherId)).toBeNull()
  })
  it('exports final chapters, standalone stories, transcripts and unattached photos without authentication secrets', async () => {
    await client.query(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer) VALUES($1,'childhood','q1','Original')",
      [userId]
    )
    await client.query(
      "INSERT INTO chapter_reviews(user_id,chapter_id,polished_text) VALUES($1,'childhood','Final corrected chapter')",
      [userId]
    )
    await client.query(
      "INSERT INTO free_stories(user_id,title,content) VALUES($1,'A day','A standalone memory')",
      [userId]
    )
    await client.query(
      'INSERT INTO voice_sessions(user_id,chapter_id,session_transcripts) VALUES($1,\'childhood\',\'[{"user_transcript":"My voice memory"}]\')',
      [userId]
    )
    await client.query("INSERT INTO photos(user_id,filename) VALUES($1,'private.jpg')", [userId])
    await client.query(
      "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES('f15e7100-1122-4333-9444-000000000001',$1,'memos/recording.webm','audio/webm','A recorded memory')",
      [userId]
    )
    const raw = (await client.query('SELECT * FROM stories WHERE user_id=$1', [userId])).rows
    expect((await resolveManuscript(db, userId, raw)).map(row => row.answer)).toEqual([
      'Final corrected chapter',
      'A day\n\nA standalone memory'
    ])
    await client.query(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer) SELECT $1,'childhood','bulk-'||n,'A retained memory' FROM generate_series(1,10005) n",
      [userId]
    )
    const response = await fetch(`${base}/user/export-data`)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.stories).toHaveLength(10006)
    expect(data.chapterReviews[0].polished_text).toBe('Final corrected chapter')
    expect(data.freeStories[0].content).toBe('A standalone memory')
    expect(data.voiceSessions[0].session_transcripts[0].user_transcript).toBe('My voice memory')
    expect(data.photos[0].filename).toBe('private.jpg')
    expect(data.voiceUploads[0].transcript).toBe('A recorded memory')
    expect(data.user).not.toHaveProperty('password_hash')
    expect(data.user).not.toHaveProperty('google_id')
  })
  it('deletes an account with answered daily/family prompts and preserves retryable media erasure work', async () => {
    const storyId = (
      await client.query(
        "INSERT INTO stories(user_id,chapter_id,question_id,answer) VALUES($1,'childhood','q1','Private') RETURNING id",
        [userId]
      )
    ).rows[0].id
    await client.query(
      "INSERT INTO daily_prompts(user_id,prompt_date,prompt_type,prompt_text,answer_story_id) VALUES($1,CURRENT_DATE,'daily','Tell me',$2)",
      [userId, storyId]
    )
    const circleId = (
      await client.query('INSERT INTO memory_circles(owner_user_id) VALUES($1) RETURNING id', [
        userId
      ])
    ).rows[0].id
    await client.query(
      "INSERT INTO family_prompts(circle_id,from_user_id,for_user_id,prompt_text,answered_story_id) VALUES($1,$2,$3,'A memory',$4)",
      [circleId, otherId, userId, storyId]
    )
    await client.query(
      'INSERT INTO family_encouragements(circle_id,from_user_id,for_user_id,related_story_id) VALUES($1,$2,$3,$4)',
      [circleId, otherId, userId, storyId]
    )
    await client.query("INSERT INTO photos(user_id,filename) VALUES($1,'private.jpg')", [userId])
    await client.query(
      "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES('f15e7100-1122-4333-9444-000000000001',$1,'memos/recording.webm','audio/webm','A recorded memory')",
      [userId]
    )
    await client.query(
      "INSERT INTO voice_models(user_id,fish_model_id,consent_given) VALUES($1,'voice.wav',true)",
      [userId]
    )
    await client.query("INSERT INTO audiobooks(user_id,filename) VALUES($1,'book.mp3')", [userId])
    const response = await fetch(`${base}/user/delete-account`, { method: 'DELETE' })
    expect(response.status).toBe(200)
    expect((await client.query('SELECT id FROM users WHERE id=$1', [userId])).rows).toEqual([])
    expect(
      (
        await client.query('SELECT object_key FROM media_deletion_jobs ORDER BY object_key')
      ).rows.map(row => row.object_key)
    ).toEqual(['audiobooks/book.mp3', 'memos/recording.webm', 'private.jpg', 'voices/voice.wav'])
    const storage = {
      delete: vi.fn().mockRejectedValueOnce(new Error('Storage down')).mockResolvedValue()
    }
    await processMediaDeletionJobs(db, storage)
    const pending = (await client.query('SELECT * FROM media_deletion_jobs')).rows
    expect(pending).toHaveLength(1)
    expect(pending[0].attempts).toBe(1)
    await client.query('UPDATE media_deletion_jobs SET next_attempt_at=NOW()')
    await processMediaDeletionJobs(db, storage)
    expect((await client.query('SELECT * FROM media_deletion_jobs')).rows).toEqual([])
  })
  it('refund usage reads the real schema and counts generated deliverables rather than purchases', async () => {
    const response = await fetch(`${base}/refunds/usage`)
    expect(response.status).toBe(200)
    expect((await response.json()).usage).toMatchObject({
      chaptersUsed: 0,
      voiceSessions: 0,
      exportsGenerated: 0
    })
    await client.query("INSERT INTO generated_exports(user_id,format) VALUES($1,'epub')", [userId])
    expect((await (await fetch(`${base}/refunds/usage`)).json()).usage.exportsGenerated).toBe(1)
  })
  it('atomically attaches an owned recording to a linked daily prompt despite engagement failure, and rejects replay or foreign recordings', async () => {
    const recording = 'f15e7100-1122-4333-9444-000000000001'
    await client.query(
      "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES($1,$2,'memos/source.webm','audio/webm','My recorded words')",
      [recording, userId]
    )
    const promptId = (
      await client.query(
        "INSERT INTO daily_prompts(user_id,prompt_date,prompt_type,prompt_text,linked_chapter_id,linked_question_id) VALUES($1,CURRENT_DATE,'daily','Tell me','childhood','q1') RETURNING id",
        [userId]
      )
    ).rows[0].id
    const response = await post(`/game/prompt/${promptId}/complete`, {
      answer: 'My recorded words',
      audioUrl: `/api/voice/uploads/${recording}`
    })
    expect(response.status).toBe(200)
    const storyId = (await response.json()).data.storyId
    expect(
      (await client.query('SELECT story_id FROM voice_uploads WHERE id=$1', [recording])).rows[0]
        .story_id
    ).toBe(storyId)
    expect(
      (
        await client.query('SELECT status,answer_story_id FROM daily_prompts WHERE id=$1', [
          promptId
        ])
      ).rows[0]
    ).toMatchObject({ status: 'completed', answer_story_id: storyId })
    expect((await post(`/game/prompt/${promptId}/complete`, { answer: 'Duplicate' })).status).toBe(
      400
    )
    const second = (
      await client.query(
        "INSERT INTO daily_prompts(user_id,prompt_date,prompt_type,prompt_text) VALUES($1,CURRENT_DATE+1,'daily','Another memory') RETURNING id",
        [userId]
      )
    ).rows[0].id
    const foreign = 'f15e7100-1122-4333-9444-000000000002'
    await client.query(
      "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES($1,$2,'memos/foreign.webm','audio/webm','Private words')",
      [foreign, otherId]
    )
    expect(
      (
        await post(`/game/prompt/${second}/complete`, {
          answer: 'Not mine',
          audioUrl: `/api/voice/uploads/${foreign}`
        })
      ).status
    ).toBe(403)
    expect(
      (await client.query('SELECT status FROM daily_prompts WHERE id=$1', [second])).rows[0].status
    ).toBe('pending')
  })
  it('joins a family circle and answers a prompt using real schema columns', async () => {
    const circleId = (
      await client.query(
        "INSERT INTO memory_circles(owner_user_id,circle_name,invite_code,invite_code_expires) VALUES($1,'Our Family','ABCDEF',NOW()+INTERVAL '1 day') RETURNING id",
        [otherId]
      )
    ).rows[0].id
    expect((await post('/game/circle/join/ABCDEF', { displayName: 'Owner' })).status).toBe(200)
    const promptId = (
      await client.query(
        "INSERT INTO family_prompts(circle_id,from_user_id,for_user_id,prompt_text) VALUES($1,$2,$3,'Tell me a memory') RETURNING id",
        [circleId, otherId, userId]
      )
    ).rows[0].id
    const response = await post(`/game/circle/prompt/${promptId}/answer`, {
      answer: 'My family answer'
    })
    expect(response.status).toBe(200)
    const prompt = (await client.query('SELECT * FROM family_prompts WHERE id=$1', [promptId]))
      .rows[0]
    expect(prompt.status).toBe('answered')
    expect(
      (await client.query('SELECT answer FROM stories WHERE id=$1', [prompt.answered_story_id]))
        .rows[0].answer
    ).toBe('My family answer')
  })
})
