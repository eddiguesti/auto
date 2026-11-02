import { createGenerationRepository, GenerationError, generationTerminal } from './repository.js'
import { resolveNativeManuscript, loadWritingSettings } from '../api/writing-manuscript.js'
import { audiobookText, renderEpub } from './render.js'
import { requestFishAudio, storeAudioStream } from './fish-audio.js'

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function consumeGenerationQueue(
  batch,
  env,
  {
    now = () => Date.now(),
    fetcher = fetch,
    styleProcessor,
    epubRenderer = renderEpub,
    audioRequester = requestFishAudio
  } = {}
) {
  if (!env.DB || !env.MEDIA) throw new GenerationError('GENERATION_STORAGE_BINDINGS_REQUIRED')
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB
  const repository = createGenerationRepository(db, { now })
  for (const message of batch.messages) {
    if (
      message.body?.version !== 1 ||
      typeof message.body?.jobId !== 'string' ||
      Object.keys(message.body).sort().join(',') !== 'jobId,version'
    ) {
      message.ack()
      continue
    }
    let claim
    try {
      claim = await repository.claim(message.body.jobId)
      if (!claim) {
        const job = await repository.get(message.body.jobId)
        if (!job || generationTerminal(job.state)) message.ack()
        else message.retry({ delaySeconds: 60 })
        continue
      }
      if (claim.kind === 'style') {
        if (!styleProcessor) throw new GenerationError('STYLE_PROCESSOR_NOT_CONFIGURED')
        const result = await styleProcessor({
          env,
          db,
          userId: claim.user_id,
          jobId: claim.id,
          now,
          leaseToken: claim.lease_token
        })
        if (result?.done === false) await repository.defer(claim)
        else if (result?.done === true) await repository.complete(claim)
        else throw new GenerationError('STYLE_PROCESSOR_RESULT_INVALID')
        message.ack()
        continue
      }
      const [rows, settings] = await Promise.all([
        resolveNativeManuscript(db, claim.user_id, { includePhotos: false }),
        loadWritingSettings(db, claim.user_id)
      ])
      if (!rows.some(row => row.answer?.trim())) throw new GenerationError('NO_MANUSCRIPT_CONTENT')
      const name = settings?.name || 'My'
      await repository.setInputHash(claim, await digest(JSON.stringify({ name, rows })))
      if (claim.kind === 'audiobook') {
        let voiceFilename
        if (claim.payload.useOwnVoice) {
          const voice = await db
            .prepare(
              'SELECT fish_model_id FROM voice_models WHERE user_id = ? AND consent_given = 1'
            )
            .bind(claim.user_id)
            .first()
          if (!voice?.fish_model_id) throw new GenerationError('CONSENTED_VOICE_SAMPLE_REQUIRED')
          voiceFilename = voice.fish_model_id
        }
        // Validate configuration before entering the irreversible effect phase.
        if (!env.FISH_AUDIO_API_KEY) throw new GenerationError('FISH_AUDIO_NOT_CONFIGURED')
        await repository.beginProviderEffect(claim, { voiceFilename })
        const audio = await audioRequester({
          env,
          bucket: env.MEDIA,
          text: audiobookText(rows, name),
          voiceFilename,
          fetcher
        })
        await repository.assertClaim(claim)
        await storeAudioStream(env.MEDIA, claim.object_key, audio.body)
      } else {
        const bytes = await epubRenderer(rows, name, { id: claim.id, now: new Date(now()) })
        await repository.assertClaim(claim)
        await env.MEDIA.put(claim.object_key, bytes, {
          httpMetadata: { contentType: 'application/epub+zip' }
        })
      }
      await repository.complete(claim)
      message.ack()
    } catch (error) {
      if (!claim) {
        message.retry({ delaySeconds: 60 })
        continue
      }
      const code = error.body?.code || error.code || 'GENERATION_FAILED'
      const fixedCode = /^[A-Z0-9_]{1,100}$/.test(code) ? code : 'GENERATION_FAILED'
      const permanent = [
        'REVIEW_REQUIRED',
        'MANUSCRIPT_TOO_LARGE',
        'NO_MANUSCRIPT_CONTENT',
        'CONSENTED_VOICE_SAMPLE_REQUIRED',
        'GENERATION_INPUT_CHANGED_OR_CLAIM_LOST'
      ].includes(fixedCode)
      const result = await repository.fail(claim, { permanent, code: fixedCode })
      if (!result || generationTerminal(result.state)) message.ack()
      else message.retry({ delaySeconds: 60 })
    }
  }
}

export async function publishGenerationOutbox(env, options = {}) {
  if (!env.DB) throw new GenerationError('GENERATION_DB_BINDING_REQUIRED')
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB
  const repository = createGenerationRepository(db, options)
  await repository.recover()
  return repository.publish(env.GENERATION_QUEUE)
}
