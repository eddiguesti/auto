import { processStoryPostprocess } from '../routes/stories.js'
import { generateOnboardingChapterImage } from '../routes/onboarding.js'
import { generateExplicitChapterImage } from '../routes/chapter-images.js'

export async function processBackgroundQueueBatch(batch, db) {
  for (const message of batch.messages) {
    try {
      if (message.body?.type === 'story.postprocess') {
        await processStoryPostprocess(db, message.body)
      } else if (message.body?.type === 'onboarding.chapter-image') {
        await generateOnboardingChapterImage(db, message.body.userId, message.body.context)
      } else if (message.body?.type === 'chapter-image.generate') {
        await generateExplicitChapterImage(db, message.body)
      } else {
        console.warn('Discarding unknown background message type', message.body?.type)
      }
      message.ack()
    } catch (error) {
      console.error('Background job failed', { type: message.body?.type, error: error.message })
      message.retry({ delaySeconds: Math.min(300, 30 * 2 ** (message.attempts - 1)) })
    }
  }
}
