/**
 * Unit tests for validation middleware
 */

import { describe, it, expect } from 'vitest'
import { validateData } from '../middleware/validate.js'

// ============ String Validation Tests ============

describe('String Validation', () => {
  it('validates required string', () => {
    const schema = { name: { type: 'string', required: true } }
    const result = validateData({ name: 'John' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.name).toBe('John')
  })

  it('rejects missing required string', () => {
    const schema = { name: { type: 'string', required: true } }
    const result = validateData({}, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('required')).toBeTruthy()
  })

  it('trims strings by default', () => {
    const schema = { name: { type: 'string' } }
    const result = validateData({ name: '  John  ' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.name).toBe('John')
  })

  it('validates minLength', () => {
    const schema = { password: { type: 'string', minLength: 8 } }
    const result = validateData({ password: 'short' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('at least 8')).toBeTruthy()
  })

  it('validates maxLength', () => {
    const schema = { name: { type: 'string', maxLength: 5 } }
    const result = validateData({ name: 'TooLongName' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('at most 5')).toBeTruthy()
  })

  it('validates pattern', () => {
    const schema = {
      code: {
        type: 'string',
        pattern: /^[A-Z]{3}$/,
        patternMessage: 'must be 3 uppercase letters'
      }
    }
    const result = validateData({ code: 'abc' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('3 uppercase')).toBeTruthy()
  })

  it('validates enum', () => {
    const schema = { role: { type: 'string', enum: ['admin', 'user'] } }
    const result = validateData({ role: 'invalid' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('one of')).toBeTruthy()
  })
})

// ============ Email Validation Tests ============

describe('Email Validation', () => {
  it('validates valid email', () => {
    const schema = { email: { type: 'email', required: true } }
    const result = validateData({ email: 'test@example.com' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.email).toBe('test@example.com')
  })

  it('normalizes email to lowercase', () => {
    const schema = { email: { type: 'email' } }
    const result = validateData({ email: 'TEST@EXAMPLE.COM' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.email).toBe('test@example.com')
  })

  it('rejects invalid email', () => {
    const schema = { email: { type: 'email' } }
    const result = validateData({ email: 'not-an-email' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('valid email')).toBeTruthy()
  })
})

// ============ Integer Validation Tests ============

describe('Integer Validation', () => {
  it('validates integer', () => {
    const schema = { age: { type: 'integer', required: true } }
    const result = validateData({ age: 25 }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.age).toBe(25)
  })

  it('parses string to integer', () => {
    const schema = { age: { type: 'integer' } }
    const result = validateData({ age: '25' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.age).toBe(25)
  })

  it('validates min constraint', () => {
    const schema = { year: { type: 'integer', min: 1900 } }
    const result = validateData({ year: 1800 }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('at least 1900')).toBeTruthy()
  })

  it('validates max constraint', () => {
    const schema = { limit: { type: 'integer', max: 100 } }
    const result = validateData({ limit: 150 }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('at most 100')).toBeTruthy()
  })

  it('rejects non-integer', () => {
    const schema = { count: { type: 'integer' } }
    const result = validateData({ count: 'abc' }, schema)
    expect(result.valid).toBe(false)
  })
})

// ============ Boolean Validation Tests ============

describe('Boolean Validation', () => {
  it('validates true boolean', () => {
    const schema = { active: { type: 'boolean' } }
    const result = validateData({ active: true }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.active).toBe(true)
  })

  it('parses string "true"', () => {
    const schema = { active: { type: 'boolean' } }
    const result = validateData({ active: 'true' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.active).toBe(true)
  })

  it('parses string "false"', () => {
    const schema = { active: { type: 'boolean' } }
    const result = validateData({ active: 'false' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.active).toBe(false)
  })
})

// ============ Array Validation Tests ============

describe('Array Validation', () => {
  it('validates array', () => {
    const schema = { tags: { type: 'array' } }
    const result = validateData({ tags: ['a', 'b'] }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.tags).toEqual(['a', 'b'])
  })

  it('validates array minLength', () => {
    const schema = { tags: { type: 'array', minLength: 2 } }
    const result = validateData({ tags: ['a'] }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('at least 2')).toBeTruthy()
  })

  it('validates array maxLength', () => {
    const schema = { tags: { type: 'array', maxLength: 2 } }
    const result = validateData({ tags: ['a', 'b', 'c'] }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('at most 2')).toBeTruthy()
  })

  it('rejects non-array', () => {
    const schema = { tags: { type: 'array' } }
    const result = validateData({ tags: 'not-array' }, schema)
    expect(result.valid).toBe(false)
  })
})

// ============ URL Validation Tests ============

describe('URL Validation', () => {
  it('validates valid URL', () => {
    const schema = { website: { type: 'url' } }
    const result = validateData({ website: 'https://example.com' }, schema)
    expect(result.valid).toBe(true)
  })

  it('validates protocol restriction', () => {
    const schema = { website: { type: 'url', protocols: ['https'] } }
    const result = validateData({ website: 'http://example.com' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('protocol')).toBeTruthy()
  })

  it('rejects invalid URL', () => {
    const schema = { website: { type: 'url' } }
    const result = validateData({ website: 'not-a-url' }, schema)
    expect(result.valid).toBe(false)
  })
})

// ============ Slug Validation Tests ============

describe('Slug Validation', () => {
  it('validates valid slug', () => {
    const schema = { chapterId: { type: 'slug' } }
    const result = validateData({ chapterId: 'early-childhood' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.chapterId).toBe('early-childhood')
  })

  it('normalizes to lowercase', () => {
    const schema = { chapterId: { type: 'slug' } }
    const result = validateData({ chapterId: 'Early-Childhood' }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.chapterId).toBe('early-childhood')
  })

  it('rejects invalid slug with spaces', () => {
    const schema = { chapterId: { type: 'slug' } }
    const result = validateData({ chapterId: 'early childhood' }, schema)
    expect(result.valid).toBe(false)
  })
})

// ============ Unexpected Fields Tests ============

describe('Unexpected Fields Rejection', () => {
  it('rejects unexpected fields by default', () => {
    const schema = { name: { type: 'string' } }
    const result = validateData({ name: 'John', extra: 'field' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('unexpected')).toBeTruthy()
  })

  it('allows unexpected fields when configured', () => {
    const schema = { name: { type: 'string' } }
    const result = validateData({ name: 'John', extra: 'field' }, schema, { rejectUnknown: false })
    expect(result.valid).toBe(true)
    expect(Object.keys(result.data).length).toBe(1) // Only validated field in data
  })
})

// ============ Default Values Tests ============

describe('Default Values', () => {
  it('applies default for missing optional field', () => {
    const schema = { limit: { type: 'integer', default: 50 } }
    const result = validateData({}, schema)
    expect(result.valid).toBe(true)
    expect(result.data.limit).toBe(50)
  })

  it('uses provided value over default', () => {
    const schema = { limit: { type: 'integer', default: 50 } }
    const result = validateData({ limit: 100 }, schema)
    expect(result.valid).toBe(true)
    expect(result.data.limit).toBe(100)
  })
})

// ============ Custom Validator Tests ============

describe('Custom Validators', () => {
  it('runs custom validator', () => {
    const schema = {
      password: {
        type: 'string',
        required: true,
        validate: v => {
          if (!/[A-Z]/.test(v)) return 'must contain uppercase letter'
          return true
        }
      }
    }
    const result = validateData({ password: 'lowercase' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].includes('uppercase')).toBeTruthy()
  })

  it('passes with valid custom validation', () => {
    const schema = {
      password: {
        type: 'string',
        required: true,
        validate: v => (/[A-Z]/.test(v) ? true : 'must contain uppercase')
      }
    }
    const result = validateData({ password: 'ValidPass' }, schema)
    expect(result.valid).toBe(true)
  })
})
