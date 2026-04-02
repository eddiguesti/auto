/**
 * Unit tests for userRepository
 * Tests each method's SQL and return shape using a mock DB.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockDb } from '../testUtils.js'

process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only-minimum-32-chars'
process.env.NODE_ENV = 'test'

import { userRepository } from '../../repositories/userRepository.js'

const MOCK_USER = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  password_hash: '$2a$12$hashed',
  google_id: null,
  birth_year: 1960,
  avatar_url: null,
  premium_until: null,
  premium_activated_at: null,
  is_admin: false,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
}

describe('userRepository.findById', () => {
  it('returns user when found', async () => {
    const db = createMockDb()
    db.query = async (sql, params) => ({ rows: [MOCK_USER], rowCount: 1 })
    const result = await userRepository.findById(db, 1)
    expect(result).toEqual(MOCK_USER)
  })

  it('returns null when not found', async () => {
    const db = createMockDb()
    db.query = async () => ({ rows: [], rowCount: 0 })
    const result = await userRepository.findById(db, 999)
    expect(result).toBeNull()
  })

  it('passes userId as parameter', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [], rowCount: 0 }
      }
    }
    await userRepository.findById(db, 42)
    expect(queries[0].params).toContain(42)
  })
})

describe('userRepository.findByEmail', () => {
  it('returns user when email matches', async () => {
    const db = createMockDb()
    db.query = async () => ({ rows: [MOCK_USER], rowCount: 1 })
    const result = await userRepository.findByEmail(db, 'test@example.com')
    expect(result).toEqual(MOCK_USER)
  })

  it('returns null when email not found', async () => {
    const db = createMockDb()
    db.query = async () => ({ rows: [], rowCount: 0 })
    const result = await userRepository.findByEmail(db, 'nobody@example.com')
    expect(result).toBeNull()
  })

  it('passes email as parameter', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [], rowCount: 0 }
      }
    }
    await userRepository.findByEmail(db, 'test@example.com')
    expect(queries[0].params).toContain('test@example.com')
  })
})

describe('userRepository.create', () => {
  it('returns created user with id', async () => {
    const created = { id: 5, email: 'new@example.com', name: 'New', created_at: new Date() }
    const db = { query: async () => ({ rows: [created], rowCount: 1 }) }
    const result = await userRepository.create(db, {
      email: 'new@example.com',
      passwordHash: 'hash',
      name: 'New'
    })
    expect(result.id).toBe(5)
    expect(result.email).toBe('new@example.com')
  })

  it('passes all fields as parameters', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [{ id: 1 }] }
      }
    }
    await userRepository.create(db, { email: 'e@e.com', passwordHash: 'hash', name: 'Name' })
    const params = queries[0].params
    expect(params).toContain('e@e.com')
    expect(params).toContain('hash')
    expect(params).toContain('Name')
  })
})

describe('userRepository.updateProfile', () => {
  it('returns updated user', async () => {
    const updated = { ...MOCK_USER, name: 'Updated', birth_year: 1965 }
    const db = { query: async () => ({ rows: [updated], rowCount: 1 }) }
    const result = await userRepository.updateProfile(db, 1, { name: 'Updated', birthYear: 1965 })
    expect(result.name).toBe('Updated')
    expect(result.birth_year).toBe(1965)
  })

  it('passes userId and fields as parameters', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [MOCK_USER] }
      }
    }
    await userRepository.updateProfile(db, 1, { name: 'Alice', birthYear: 1970 })
    const params = queries[0].params
    expect(params).toContain(1)
    expect(params).toContain('Alice')
    expect(params).toContain(1970)
  })
})

describe('userRepository.setPremium', () => {
  it('executes update without throwing', async () => {
    let called = false
    const db = {
      query: async () => {
        called = true
        return { rows: [], rowCount: 1 }
      }
    }
    await userRepository.setPremium(db, 1, new Date('2025-12-31'))
    expect(called).toBe(true)
  })

  it('passes date and userId as parameters', async () => {
    const queries = []
    const db = {
      query: async (sql, params) => {
        queries.push({ sql, params })
        return { rows: [] }
      }
    }
    const until = new Date('2025-06-01')
    await userRepository.setPremium(db, 7, until)
    expect(queries[0].params).toContain(7)
    expect(queries[0].params).toContain(until)
  })
})

describe('userRepository.exists', () => {
  it('returns true when user exists', async () => {
    const db = { query: async () => ({ rows: [{ id: 1 }], rowCount: 1 }) }
    const result = await userRepository.exists(db, 'test@example.com')
    expect(result).toBe(true)
  })

  it('returns false when user does not exist', async () => {
    const db = { query: async () => ({ rows: [], rowCount: 0 }) }
    const result = await userRepository.exists(db, 'nobody@example.com')
    expect(result).toBe(false)
  })
})
