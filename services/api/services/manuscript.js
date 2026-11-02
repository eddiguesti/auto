import { chapters } from '@easy-memoir/shared/chapters'
import { ValidationError } from '../utils/errors.js'

// All publishing formats use the same resolved text. A saved reviewed chapter is
// the author's final copy; its individual answers remain available for editing.
export function assembleManuscript(stories, reviews = [], freeStories = []) {
  const resolved = []
  const reviewed = new Map(reviews.map(row => [row.chapter_id, row]))
  const chapterIds = new Set([...stories.map(row => row.chapter_id), ...reviewed.keys()])
  for (const chapterId of chapterIds) {
    const entries = stories.filter(row => row.chapter_id === chapterId)
    const review = reviewed.get(chapterId)
    const polished = review?.polished_text
    if (
      polished?.trim() &&
      review.updated_at &&
      entries.some(row => row.updated_at && new Date(row.updated_at) > new Date(review.updated_at))
    ) {
      throw new ValidationError(
        'Memories in this chapter changed. Review the chapter again before publishing.'
      )
    }
    if (typeof polished === 'string' && polished.trim()) {
      resolved.push({
        chapter_id: chapterId,
        question_id: '__reviewed__',
        answer: polished,
        photos: entries.flatMap(row => row.photos || [])
      })
    } else resolved.push(...entries)
  }
  for (const row of freeStories) {
    if (!row.content?.trim()) continue
    resolved.push({
      chapter_id: 'standalone-memories',
      chapter_title: 'Other Memories',
      question_id: `free-${row.id}`,
      answer: `${row.title?.trim() ? `${row.title.trim()}\n\n` : ''}${row.content}`,
      photos: []
    })
  }
  return resolved.sort((a, b) => {
    const order = id => {
      const index = chapters.findIndex(chapter => chapter.id === id)
      return index < 0 ? chapters.length : index
    }
    return (
      order(a.chapter_id) - order(b.chapter_id) ||
      a.chapter_id.localeCompare(b.chapter_id) ||
      a.question_id.localeCompare(b.question_id, undefined, { numeric: true })
    )
  })
}

export async function resolveManuscript(db, userId, stories) {
  const [reviews, freeStories] = await Promise.all([
    db.query(
      'SELECT chapter_id, polished_text, updated_at FROM chapter_reviews WHERE user_id = $1',
      [userId]
    ),
    db.query(
      'SELECT id, title, content FROM free_stories WHERE user_id = $1 ORDER BY created_at, id',
      [userId]
    )
  ])
  return assembleManuscript(stories, reviews.rows, freeStories.rows)
}

export function manuscriptChapters(stories) {
  const extra = [...new Set(stories.map(story => story.chapter_id))]
    .filter(id => !chapters.some(chapter => chapter.id === id))
    .map(id => ({
      id,
      title:
        stories.find(story => story.chapter_id === id)?.chapter_title ||
        (id === 'family-prompts' ? 'Family Memories' : id.replace(/-/g, ' ')),
      subtitle: ''
    }))
  return [...chapters, ...extra]
}
