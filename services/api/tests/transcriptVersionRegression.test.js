import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/memoryContext.js', () => ({ getMemoryContext: vi.fn(async () => '') }))
vi.mock('../services/grokService.js', () => ({ grokChat: vi.fn() }))
import { grokChat } from '../services/grokService.js'
import { compileTranscripts } from '../services/transcriptService.js'

beforeEach(() => vi.clearAllMocks())
describe('transcript compilation optimistic concurrency', () => {
  it('does not save an older AI result over a newer raw transcript', async () => {
    const story = {
      id: 21,
      answer: 'Original memory.',
      source_version: '2026-11-02 12:00:00.123456'
    }
    let current = { ...story },
      compiled = null
    const db = {
      query: vi.fn(async (sql, values) => {
        if (sql.includes('SELECT id, answer')) return { rows: [{ ...current }] }
        if (sql.startsWith('UPDATE stories')) {
          const matches = values[3] === current.answer && values[5] === current.source_version
          if (matches) compiled = values[0]
          return { rows: [], rowCount: matches ? 1 : 0 }
        }
        return { rows: [], rowCount: 1 }
      })
    }
    grokChat.mockImplementationOnce(async () => {
      current = {
        ...current,
        answer: 'New correction.',
        source_version: '2026-11-02 12:00:01.000001'
      }
      return { content: 'Polished OLD memory.' }
    })
    await compileTranscripts(db, 7, 11, ['q1'])
    expect(compiled).toBeNull()
    const update = db.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE stories'))
    expect(update[0]).toContain('AND updated_at::text = $6 AND compiled_content IS NULL')
    expect(update[1]).toEqual([
      'Polished OLD memory.',
      21,
      7,
      story.answer,
      11,
      story.source_version
    ])
    expect(db.query.mock.calls.at(-1)[0]).toContain('SELECT COUNT(*) FROM stories')
  })
  it('compiles unchanged content without changing the raw memory modification timestamp', async () => {
    const story = {
      id: 21,
      answer: 'Original memory.',
      source_version: '2026-11-02 12:00:00.123456'
    }
    const db = {
      query: vi.fn(async sql => ({
        rows: sql.includes('SELECT id, answer') ? [story] : [],
        rowCount: 1
      }))
    }
    grokChat.mockResolvedValueOnce({ content: 'Polished memory.' })
    await compileTranscripts(db, 7, 11, ['q1'])
    const update = db.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE stories'))
    expect(update[0]).not.toContain('updated_at =')
    expect(update[1][0]).toBe('Polished memory.')
  })
})
