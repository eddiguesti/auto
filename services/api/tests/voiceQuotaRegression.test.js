import { describe, expect, it, vi } from 'vitest'
import { reserveAIUsage } from '../middleware/aiQuota.js'

describe('chargeable AI quota', () => {
  it('reserves only the available free allowance atomically and rejects further requests', async () => {
    let count = 0
    const db = {
      query: vi.fn(async sql => {
        if (sql.includes('SELECT premium_until')) return { rows: [{ premium_until: null }] }
        return { rows: count < 10 ? [{ request_count: ++count }] : [] }
      })
    }
    for (let i = 1; i <= 10; i++) expect(await reserveAIUsage(db, 7)).toEqual({ aiUsageToday: i })
    await expect(reserveAIUsage(db, 7)).rejects.toMatchObject({
      code: 'UPGRADE_REQUIRED',
      statusCode: 403
    })
    expect(count).toBe(10)
    expect(db.query.mock.calls.at(-1)[0]).toContain('WHERE ai_usage.request_count < $2')
  })
  it('rejects deleted or unavailable accounts and never spends their allowance', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) }
    await expect(reserveAIUsage(db, 7)).rejects.toMatchObject({ statusCode: 401 })
    expect(db.query).toHaveBeenCalledOnce()
    await expect(reserveAIUsage(null, 7)).rejects.toMatchObject({ statusCode: 503 })
  })
  it('recognizes premium users without writing daily usage', async () => {
    const db = { query: vi.fn(async () => ({ rows: [{ premium_until: '2099-01-01' }] })) }
    expect(await reserveAIUsage(db, 7)).toEqual({ isPremium: true })
    expect(db.query).toHaveBeenCalledOnce()
  })
})
