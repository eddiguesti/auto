// @ts-check
/**
 * Central registry of all pg-boss job queue names.
 * Both producers (API routes) and consumers (worker) import from here.
 */

export const JOB = {
  /** Audiobook generation via Fish.audio TTS — 30-120 seconds */
  AUDIOBOOK_GENERATE: 'audiobook:generate',

  /** EPUB eBook generation — 5-15 seconds */
  EPUB_GENERATE: 'epub:generate',

  /** AI chapter illustration via Replicate/SDXL — 10-30 seconds */
  CHAPTER_IMAGE: 'chapter:image'
}
