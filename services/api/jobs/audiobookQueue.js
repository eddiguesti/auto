import crypto from 'crypto'
import { getQueue } from './queue.js'
import { JOB } from './jobNames.js'
import { generateAudiobook } from './audiobookWorker.js'

function queueBinding() {
  return globalThis.__CLOUDFLARE_BINDINGS__?.AUDIOBOOK_QUEUE || null
}

export async function enqueueAudiobook(db, data) {
  const queue = queueBinding()
  if (!queue) {
    const boss = await getQueue()
    return boss.send(JOB.AUDIOBOOK_GENERATE, data, {
      retryLimit: 2,
      retryDelay: 60,
      expireInSeconds: 900
    })
  }

  const jobId = crypto.randomUUID()
  await db.query(
    `INSERT INTO background_jobs (id, job_name, user_id, data)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [jobId, JOB.AUDIOBOOK_GENERATE, data.userId, JSON.stringify(data)]
  )

  try {
    await queue.send({ jobId, ...data })
  } catch (error) {
    await db.query(
      `UPDATE background_jobs
       SET state = 'failed', error = $2, updated_at = NOW(), completed_at = NOW()
       WHERE id = $1`,
      [jobId, 'Failed to enqueue job']
    )
    throw error
  }

  return jobId
}

export async function getAudiobookJob(db, jobId) {
  const cloudflareJob = await db.query(
    `SELECT id::text, state, user_id, data, output, error
     FROM background_jobs
     WHERE id::text = $1 AND job_name = $2`,
    [jobId, JOB.AUDIOBOOK_GENERATE]
  )
  if (cloudflareJob.rows[0]) {
    const row = cloudflareJob.rows[0]
    return {
      id: row.id,
      state: row.state,
      data: row.data,
      output: row.output,
      error: row.error
    }
  }

  const boss = await getQueue()
  return boss.getJobById(JOB.AUDIOBOOK_GENERATE, jobId)
}

/** Cloudflare Queue consumer. */
export async function processAudiobookQueueBatch(batch, db) {
  for (const message of batch.messages) {
    const { jobId, userId, useOwnVoice } = message.body || {}
    if (!jobId || !userId) {
      message.ack()
      continue
    }

    await db.query(
      `UPDATE background_jobs
       SET state = 'active', attempts = attempts + 1, started_at = COALESCE(started_at, NOW()),
           updated_at = NOW(), error = NULL
       WHERE id = $1`,
      [jobId]
    )

    try {
      const output = await generateAudiobook({ userId, useOwnVoice }, db, jobId)
      await db.query(
        `UPDATE background_jobs
         SET state = 'completed', output = $2::jsonb, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [jobId, JSON.stringify(output)]
      )
      message.ack()
    } catch (error) {
      await db.query(
        `UPDATE background_jobs
         SET state = 'failed', error = $2, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [jobId, String(error.message || 'Audiobook generation failed').slice(0, 500)]
      )
      message.retry({ delaySeconds: Math.min(300, 30 * 2 ** (message.attempts - 1)) })
    }
  }
}
