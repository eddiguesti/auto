/**
 * Unit tests for validation middleware
 * Run with: node server/tests/validate.test.js
 */

import assert from 'assert'
import { validateData } from '../middleware/validate.js'

// Test utilities
let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${err.message}`)
  }
}

function describe(name, fn) {
  console.log(`\n${name}`)
  fn()
}

// ============ String Validation Tests ============

describe('String Validation', () => {
  test('validates required string', () => {
    const schema = { name: { type: 'string', required: true } }
    const result = validateData({ name: 'John' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.name, 'John')
  })

  test('rejects missing required string', () => {
    const schema = { name: { type: 'string', required: true } }
    const result = validateData({}, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('required'))
  })

  test('trims strings by default', () => {
    const schema = { name: { type: 'string' } }
    const result = validateData({ name: '  John  ' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.name, 'John')
  })

  test('validates minLength', () => {
    const schema = { password: { type: 'string', minLength: 8 } }
    const result = validateData({ password: 'short' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('at least 8'))
  })

  test('validates maxLength', () => {
    const schema = { name: { type: 'string', maxLength: 5 } }
    const result = validateData({ name: 'TooLongName' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('at most 5'))
  })

  test('validates pattern', () => {
    const schema = {
      code: {
        type: 'string',
        pattern: /^[A-Z]{3}$/,
        patternMessage: 'must be 3 uppercase letters'
      }
    }
    const result = validateData({ code: 'abc' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('3 uppercase'))
  })

  test('validates enum', () => {
    const schema = { role: { type: 'string', enum: ['admin', 'user'] } }
    const result = validateData({ role: 'invalid' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('one of'))
  })
})

// ============ Email Validation Tests ============

describe('Email Validation', () => {
  test('validates valid email', () => {
    const schema = { email: { type: 'email', required: true } }
    const result = validateData({ email: 'test@example.com' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.email, 'test@example.com')
  })

  test('normalizes email to lowercase', () => {
    const schema = { email: { type: 'email' } }
    const result = validateData({ email: 'TEST@EXAMPLE.COM' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.email, 'test@example.com')
  })

  test('rejects invalid email', () => {
    const schema = { email: { type: 'email' } }
    const result = validateData({ email: 'not-an-email' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('valid email'))
  })
})

// ============ Integer Validation Tests ============

describe('Integer Validation', () => {
  test('validates integer', () => {
    const schema = { age: { type: 'integer', required: true } }
    const result = validateData({ age: 25 }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.age, 25)
  })

  test('parses string to integer', () => {
    const schema = { age: { type: 'integer' } }
    const result = validateData({ age: '25' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.age, 25)
  })

  test('validates min constraint', () => {
    const schema = { year: { type: 'integer', min: 1900 } }
    const result = validateData({ year: 1800 }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('at least 1900'))
  })

  test('validates max constraint', () => {
    const schema = { limit: { type: 'integer', max: 100 } }
    const result = validateData({ limit: 150 }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('at most 100'))
  })

  test('rejects non-integer', () => {
    const schema = { count: { type: 'integer' } }
    const result = validateData({ count: 'abc' }, schema)
    assert.strictEqual(result.valid, false)
  })
})

// ============ Boolean Validation Tests ============

describe('Boolean Validation', () => {
  test('validates true boolean', () => {
    const schema = { active: { type: 'boolean' } }
    const result = validateData({ active: true }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.active, true)
  })

  test('parses string "true"', () => {
    const schema = { active: { type: 'boolean' } }
    const result = validateData({ active: 'true' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.active, true)
  })

  test('parses string "false"', () => {
    const schema = { active: { type: 'boolean' } }
    const result = validateData({ active: 'false' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.active, false)
  })
})

// ============ Array Validation Tests ============

describe('Array Validation', () => {
  test('validates array', () => {
    const schema = { tags: { type: 'array' } }
    const result = validateData({ tags: ['a', 'b'] }, schema)
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.data.tags, ['a', 'b'])
  })

  test('validates array minLength', () => {
    const schema = { tags: { type: 'array', minLength: 2 } }
    const result = validateData({ tags: ['a'] }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('at least 2'))
  })

  test('validates array maxLength', () => {
    const schema = { tags: { type: 'array', maxLength: 2 } }
    const result = validateData({ tags: ['a', 'b', 'c'] }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('at most 2'))
  })

  test('rejects non-array', () => {
    const schema = { tags: { type: 'array' } }
    const result = validateData({ tags: 'not-array' }, schema)
    assert.strictEqual(result.valid, false)
  })
})

// ============ URL Validation Tests ============

describe('URL Validation', () => {
  test('validates valid URL', () => {
    const schema = { website: { type: 'url' } }
    const result = validateData({ website: 'https://example.com' }, schema)
    assert.strictEqual(result.valid, true)
  })

  test('validates protocol restriction', () => {
    const schema = { website: { type: 'url', protocols: ['https'] } }
    const result = validateData({ website: 'http://example.com' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('protocol'))
  })

  test('rejects invalid URL', () => {
    const schema = { website: { type: 'url' } }
    const result = validateData({ website: 'not-a-url' }, schema)
    assert.strictEqual(result.valid, false)
  })
})

// ============ Slug Validation Tests ============

describe('Slug Validation', () => {
  test('validates valid slug', () => {
    const schema = { chapterId: { type: 'slug' } }
    const result = validateData({ chapterId: 'early-childhood' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.chapterId, 'early-childhood')
  })

  test('normalizes to lowercase', () => {
    const schema = { chapterId: { type: 'slug' } }
    const result = validateData({ chapterId: 'Early-Childhood' }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.chapterId, 'early-childhood')
  })

  test('rejects invalid slug with spaces', () => {
    const schema = { chapterId: { type: 'slug' } }
    const result = validateData({ chapterId: 'early childhood' }, schema)
    assert.strictEqual(result.valid, false)
  })
})

// ============ Unexpected Fields Tests ============

describe('Unexpected Fields Rejection', () => {
  test('rejects unexpected fields by default', () => {
    const schema = { name: { type: 'string' } }
    const result = validateData({ name: 'John', extra: 'field' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('unexpected'))
  })

  test('allows unexpected fields when configured', () => {
    const schema = { name: { type: 'string' } }
    const result = validateData({ name: 'John', extra: 'field' }, schema, { rejectUnknown: false })
    assert.strictEqual(result.valid, true)
    assert.strictEqual(Object.keys(result.data).length, 1) // Only validated field in data
  })
})

// ============ Default Values Tests ============

describe('Default Values', () => {
  test('applies default for missing optional field', () => {
    const schema = { limit: { type: 'integer', default: 50 } }
    const result = validateData({}, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.limit, 50)
  })

  test('uses provided value over default', () => {
    const schema = { limit: { type: 'integer', default: 50 } }
    const result = validateData({ limit: 100 }, schema)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data.limit, 100)
  })
})

// ============ Custom Validator Tests ============

describe('Custom Validators', () => {
  test('runs custom validator', () => {
    const schema = {
      password: {
        type: 'string',
        required: true,
        validate: (v) => {
          if (!/[A-Z]/.test(v)) return 'must contain uppercase letter'
          return true
        }
      }
    }
    const result = validateData({ password: 'lowercase' }, schema)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors[0].includes('uppercase'))
  })

  test('passes with valid custom validation', () => {
    const schema = {
      password: {
        type: 'string',
        required: true,
        validate: (v) => /[A-Z]/.test(v) ? true : 'must contain uppercase'
      }
    }
    const result = validateData({ password: 'ValidPass' }, schema)
    assert.strictEqual(result.valid, true)
  })
})

// ============ Summary ============

console.log('\n' + '='.repeat(50))
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log('='.repeat(50))

if (failed > 0) {
  process.exit(1)
}
