import { describe, expect, it, vi } from 'vitest'
import {
  assembleManuscript,
  resolveManuscript,
  manuscriptChapters
} from '../services/manuscript.js'

describe('the author approved manuscript shared by every publishing format', () => {
  it('uses reviewed text once, retaining chapter photographs and excluding superseded raw answers', () => {
    const result = assembleManuscript(
      [
        { chapter_id: 'childhood', question_id: 'q2', answer: 'Old answer', photos: [{ id: 1 }] },
        {
          chapter_id: 'childhood',
          question_id: 'q1',
          answer: 'Another old answer',
          photos: [{ id: 2 }]
        }
      ],
      [{ chapter_id: 'childhood', polished_text: 'My final corrected chapter.' }]
    )
    expect(result).toEqual([
      {
        chapter_id: 'childhood',
        question_id: '__reviewed__',
        answer: 'My final corrected chapter.',
        photos: [{ id: 1 }, { id: 2 }]
      }
    ])
  })
  it('includes free stories and family memories, preserving their titles and numeric question order', () => {
    const result = assembleManuscript(
      [
        { chapter_id: 'childhood', question_id: 'q10', answer: 'Tenth' },
        { chapter_id: 'childhood', question_id: 'q2', answer: 'Second' },
        { chapter_id: 'family-prompts', question_id: 'family-1', answer: 'A family answer' }
      ],
      [],
      [{ id: 1, title: 'Wedding', content: 'A standalone story' }]
    )
    expect(result.slice(0, 2).map(row => row.answer)).toEqual(['Second', 'Tenth'])
    expect(result.at(-1).answer).toBe('Wedding\n\nA standalone story')
    expect(manuscriptChapters(result).map(chapter => chapter.title)).toContain('Other Memories')
    expect(manuscriptChapters(result).map(chapter => chapter.title)).toContain('Family Memories')
  })
  it('does not silently publish stale reviewed text after newer raw edits', () => {
    expect(() =>
      assembleManuscript(
        [
          {
            chapter_id: 'childhood',
            question_id: 'q1',
            answer: 'New facts',
            updated_at: '2026-11-02T12:00:00Z'
          }
        ],
        [
          {
            chapter_id: 'childhood',
            polished_text: 'Old final copy',
            updated_at: '2026-11-01T12:00:00Z'
          }
        ]
      )
    ).toThrow('Review the chapter again')
  })
  it('loads only the signed in owner’s reviews and standalone stories', async () => {
    const db = {
      query: vi.fn(async sql => ({
        rows: sql.includes('chapter_reviews')
          ? [{ chapter_id: 'childhood', polished_text: 'Final copy' }]
          : [{ id: 4, content: 'Personal standalone memory' }]
      }))
    }
    const result = await resolveManuscript(db, 7, [])
    expect(db.query.mock.calls.every(call => call[1][0] === 7)).toBe(true)
    expect(result.map(row => row.answer)).toEqual(['Final copy', 'Personal standalone memory'])
  })
})
