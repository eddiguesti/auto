import { describe, it, expect } from 'vitest'
import { getDashboardProgress } from '../dashboardProgress'

const chapters = [
  { id: 'childhood', questions: [{ question: 'Home?' }, { question: 'School?' }] },
  { id: 'family', questions: [{ question: 'Family?' }] }
]

describe('dashboard progress', () => {
  it('does not let obsolete chapters or invalid counts inflate saved progress', () => {
    const result = getDashboardProgress(chapters, { childhood: '999', family: -2, obsolete: 100 })
    expect(result.totalAnswered).toBe(2)
    expect(result.totalProgress).toBe(67)
    expect(result.nextChapter.id).toBe('family')
    expect(result.completedChapters).toBe(1)
  })

  it('treats unusable server values as empty and distinguishes a completed memoir', () => {
    expect(
      getDashboardProgress(chapters, { childhood: 'bad', family: Infinity }).totalAnswered
    ).toBe(0)
    const finished = getDashboardProgress(chapters, { childhood: 2, family: 1 })
    expect(finished.nextChapter).toBeNull()
    expect(finished.totalProgress).toBe(100)
  })
})
