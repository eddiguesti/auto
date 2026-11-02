import { chapters } from '../../packages/shared/chapters.js'
import { ApiError } from './errors.js'
import { createMappedCodec } from './value-codecs.js'

const MAX_MANUSCRIPT_BYTES = 8 * 1024 * 1024

// Publishing formats and the unpaid preview share this exact resolution policy.
// Pages have stable unique ordering and never silently cap a memoir's row count.
export async function resolveNativeManuscript(db, userId, { includePhotos = true } = {}) {
  let bytes = 0
  const collect = async (table, columns, extra = '') => {
    const rows = []
    let cursor = 0
    const codec = createMappedCodec(table, { wallClockTimeZone: 'UTC' })
    while (true) {
      const result = await db
        .prepare(
          `SELECT ${columns} FROM ${table} WHERE user_id = ? AND id > ? ${extra} ORDER BY id LIMIT 50`
        )
        .bind(userId, cursor)
        .all()
      const active = await db
        .prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL')
        .bind(userId)
        .first()
      if (!active) throw new ApiError(401, { error: 'Account unavailable' })
      for (const row of result.results) {
        bytes += new TextEncoder().encode(JSON.stringify(row)).byteLength
        if (bytes > MAX_MANUSCRIPT_BYTES)
          throw new ApiError(413, {
            error:
              'This manuscript exceeds the 8 MiB publishing limit. Your complete data is available from account export.',
            code: 'MANUSCRIPT_TOO_LARGE'
          })
        rows.push(codec.decodeRow(row))
      }
      if (result.results.length < 50) return rows
      cursor = result.results.at(-1).id
    }
  }
  const stories = await collect(
    'stories',
    'id, user_id, chapter_id, question_id, answer, original_answer, style_applied, style_applied_at, created_at, updated_at'
  )
  const reviews = await collect(
    'chapter_reviews',
    'id, chapter_id, polished_text, raw_source_text, updated_at'
  )
  const free = await collect(
    'free_stories',
    'id, title, content, created_at',
    "AND trim(content) != ''"
  )
  const photosByStory = new Map()
  if (includePhotos) {
    let cursor = 0
    while (true) {
      const page = await db
        .prepare(
          `SELECT p.id, p.story_id, p.filename, p.caption FROM photos p JOIN stories s ON s.id = p.story_id
        WHERE s.user_id = ? AND (p.user_id IS NULL OR p.user_id = ?) AND p.id > ? ORDER BY p.id LIMIT 100`
        )
        .bind(userId, userId, cursor)
        .all()
      for (const row of page.results) {
        bytes += new TextEncoder().encode(JSON.stringify(row)).byteLength
        if (bytes > MAX_MANUSCRIPT_BYTES)
          throw new ApiError(413, {
            error: 'This manuscript exceeds the publishing limit.',
            code: 'MANUSCRIPT_TOO_LARGE'
          })
        const { story_id, ...photo } = row
        if (!photosByStory.has(story_id)) photosByStory.set(story_id, [])
        photosByStory.get(story_id).push(photo)
      }
      if (page.results.length < 100) break
      cursor = page.results.at(-1).id
    }
  }
  for (const story of stories) story.photos = photosByStory.get(story.id) || []
  const resolved = []
  const reviewed = new Map(reviews.map(row => [row.chapter_id, row]))
  const chapterIds = new Set([...stories.map(row => row.chapter_id), ...reviewed.keys()])
  for (const id of chapterIds) {
    const entries = stories.filter(row => row.chapter_id === id)
    const review = reviewed.get(id)
    if (review?.polished_text?.trim()) {
      // Source comparison also catches deletes and changes made within the same
      // timestamp millisecond. Older imported reviews retain timestamp parity.
      const raw = [...entries]
        .filter(row => row.answer?.length)
        .sort((a, b) => a.question_id.localeCompare(b.question_id))
        .map(row => row.answer)
        .join('\n\n')
      if (
        (review.raw_source_text !== null && raw !== review.raw_source_text) ||
        entries.some(
          row => row.updated_at && review.updated_at && row.updated_at > review.updated_at
        )
      )
        throw new ApiError(400, {
          error: 'Memories in this chapter changed. Review the chapter again before publishing.',
          code: 'REVIEW_REQUIRED'
        })
      resolved.push({
        chapter_id: id,
        question_id: '__reviewed__',
        answer: review.polished_text,
        photos: entries.flatMap(row => row.photos)
      })
    } else resolved.push(...entries)
  }
  for (const row of free.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)) {
    resolved.push({
      chapter_id: 'standalone-memories',
      chapter_title: 'Other Memories',
      question_id: `free-${row.id}`,
      answer: `${row.title?.trim() ? `${row.title.trim()}\n\n` : ''}${row.content}`,
      photos: []
    })
  }
  const order = id => {
    const index = chapters.findIndex(chapter => chapter.id === id)
    return index < 0 ? chapters.length : index
  }
  return resolved.sort(
    (a, b) =>
      order(a.chapter_id) - order(b.chapter_id) ||
      a.chapter_id.localeCompare(b.chapter_id) ||
      a.question_id.localeCompare(b.question_id, undefined, { numeric: true })
  )
}

export function nativeManuscriptChapters(rows) {
  return [
    ...chapters,
    ...[...new Set(rows.map(row => row.chapter_id))]
      .filter(id => !chapters.some(chapter => chapter.id === id))
      .map(id => ({
        id,
        title:
          rows.find(row => row.chapter_id === id)?.chapter_title ||
          (id === 'family-prompts' ? 'Family Memories' : id.replaceAll('-', ' ')),
        subtitle: ''
      }))
  ]
}

export async function loadWritingSettings(db, userId) {
  return db.prepare('SELECT name FROM settings WHERE user_id = ?').bind(userId).first()
}
