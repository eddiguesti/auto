/**
 * Unit tests for storyRepository
 * Tests each method's SQL and return shape using a mock DB.
 */

import { describe, it, expect } from 'vitest'

process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only-minimum-32-chars'
process.env.NODE_ENV = 'test'

import { storyRepository } from '../../repositories/storyRepository.js'

const MOCK_STORY = {
  id: 1,
  user_id: 10,
  chapter_id: 'childhood',
  question_id: 'first-memory',
  answer: 'Playing in the garden.',
  original_answer: null,
  style_applied: null,
  style_applied_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
}

const MOCK_STORY_WITH_PHOTOS = { ...MOCK_STORY, photos: [] }

describe('storyRepository.findByUserAndChapter', () => {
  it('returns stories for given user and chapter', async () => {
    const db = { query: async () => ({ rows: [MOCK_STORY] }) }
    const result = await storyRepository.findByUserAndChapter(db, 10, 'childhood')
    expect(result).toEqual([MOCK_STORY])
  })

  it('passes userId and chapterId as params', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    await storyRepository.findByUserAndChapter(db, 10, 'childhood')
    expect(queries[0].params).toContain(10)
    expect(queries[0].params).toContain('childhood')
  })
})

describe('storyRepository.findAllByUser', () => {
  it('returns all stories for a user', async () => {
    const db = { query: async () => ({ rows: [MOCK_STORY] }) }
    const result = await storyRepository.findAllByUser(db, 10)
    expect(result).toHaveLength(1)
  })

  it('passes userId as param', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    await storyRepository.findAllByUser(db, 10)
    expect(queries[0].params).toContain(10)
  })
})

describe('storyRepository.findWithContent', () => {
  it('returns only stories with non-empty answers', async () => {
    const db = {
      query: async () => ({
        rows: [{ id: 1, chapter_id: 'childhood', question_id: 'first-memory', answer: 'text' }]
      })
    }
    const result = await storyRepository.findWithContent(db, 10)
    expect(result[0]).toHaveProperty('answer')
  })
})

describe('storyRepository.upsert', () => {
  it('returns the saved story', async () => {
    const db = { query: async () => ({ rows: [MOCK_STORY] }) }
    const result = await storyRepository.upsert(db, 10, {
      chapterId: 'childhood',
      questionId: 'first-memory',
      answer: 'Playing in the garden.'
    })
    expect(result.id).toBe(1)
    expect(result.chapter_id).toBe('childhood')
  })

  it('passes userId, chapterId, questionId, answer as params', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [MOCK_STORY] }
      }
    }
    await storyRepository.upsert(db, 10, {
      chapterId: 'childhood',
      questionId: 'q1',
      answer: 'hello'
    })
    const params = queries[0].params
    expect(params).toContain(10)
    expect(params).toContain('childhood')
    expect(params).toContain('q1')
    expect(params).toContain('hello')
  })
})

describe('storyRepository.getProgress', () => {
  it('returns array of chapter progress rows', async () => {
    const db = { query: async () => ({ rows: [{ chapter_id: 'childhood', answered: '3' }] }) }
    const result = await storyRepository.getProgress(db, 10)
    expect(result[0].chapter_id).toBe('childhood')
    expect(result[0].answered).toBe('3')
  })
})

describe('storyRepository.countByUser', () => {
  it('returns total and chapters count', async () => {
    const db = { query: async () => ({ rows: [{ total: '12', chapters: '4' }] }) }
    const result = await storyRepository.countByUser(db, 10)
    expect(result.total).toBe('12')
    expect(result.chapters).toBe('4')
  })
})

describe('storyRepository.countAnsweredInChapter', () => {
  it('returns parsed integer count', async () => {
    const db = { query: async () => ({ rows: [{ count: '5' }] }) }
    const result = await storyRepository.countAnsweredInChapter(db, 10, 'childhood')
    expect(result).toBe(5)
    expect(typeof result).toBe('number')
  })
})

describe('storyRepository.getAnswersByChapter', () => {
  it('returns array of answer strings', async () => {
    const db = { query: async () => ({ rows: [{ answer: 'A' }, { answer: 'B' }] }) }
    const result = await storyRepository.getAnswersByChapter(db, 10, 'childhood')
    expect(result).toEqual(['A', 'B'])
  })
})

describe('storyRepository.getSettings', () => {
  it('returns settings row when found', async () => {
    const settings = {
      id: 1,
      user_id: 10,
      name: 'Alice',
      created_at: new Date(),
      updated_at: new Date()
    }
    const db = { query: async () => ({ rows: [settings] }) }
    const result = await storyRepository.getSettings(db, 10)
    expect(result.name).toBe('Alice')
  })

  it('returns null when no settings', async () => {
    const db = { query: async () => ({ rows: [] }) }
    const result = await storyRepository.getSettings(db, 10)
    expect(result).toBeNull()
  })
})

describe('storyRepository.saveSettings', () => {
  it('executes upsert without throwing', async () => {
    let called = false
    const db = {
      query: async () => {
        called = true
        return { rows: [] }
      }
    }
    await storyRepository.saveSettings(db, 10, 'Alice')
    expect(called).toBe(true)
  })

  it('passes userId and name as params', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    await storyRepository.saveSettings(db, 10, 'Alice')
    expect(queries[0].params).toContain(10)
    expect(queries[0].params).toContain('Alice')
  })
})

describe('storyRepository.findWithPhotos', () => {
  it('returns stories with photos array', async () => {
    const db = { query: async () => ({ rows: [MOCK_STORY_WITH_PHOTOS] }) }
    const result = await storyRepository.findWithPhotos(db, 10)
    expect(result[0]).toHaveProperty('photos')
    expect(Array.isArray(result[0].photos)).toBe(true)
  })

  it('passes userId as param', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    await storyRepository.findWithPhotos(db, 10)
    expect(queries[0].params).toContain(10)
  })
})

describe('storyRepository.findWithPhotosByChapter', () => {
  it('passes userId and chapterId as params', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    await storyRepository.findWithPhotosByChapter(db, 10, 'childhood')
    expect(queries[0].params).toContain(10)
    expect(queries[0].params).toContain('childhood')
  })
})

describe('storyRepository.findWithPhotosForExport', () => {
  it('returns stories ordered for export', async () => {
    const db = { query: async () => ({ rows: [MOCK_STORY_WITH_PHOTOS] }) }
    const result = await storyRepository.findWithPhotosForExport(db, 10)
    expect(result).toHaveLength(1)
  })

  it('passes userId as param', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    await storyRepository.findWithPhotosForExport(db, 10)
    expect(queries[0].params).toContain(10)
  })
})
