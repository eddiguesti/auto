/**
 * Input Validation Schema Tests
 * Tests that new validation schemas reject invalid input and allow valid input
 */

import { describe, it, expect } from 'vitest'
import { validateData } from '../middleware/validate.js'

describe('Style Schemas', () => {
  const preferencesSchema = {
    tones: { type: 'array', maxLength: 10 },
    narrative: { type: 'string', maxLength: 200 },
    authorStyle: { type: 'string', maxLength: 200 }
  }

  it('allows valid style preferences', () => {
    const result = validateData(
      { tones: ['warm', 'reflective'], narrative: 'first person', authorStyle: 'Hemingway' },
      preferencesSchema
    )
    expect(result.valid).toBe(true)
    expect(result.data.tones).toEqual(['warm', 'reflective'])
  })

  it('rejects tones array exceeding max length', () => {
    const tones = Array.from({ length: 11 }, (_, i) => `tone${i}`)
    const result = validateData({ tones }, preferencesSchema)
    expect(result.valid).toBe(false)
  })

  it('rejects narrative exceeding max length', () => {
    const result = validateData({ narrative: 'x'.repeat(201) }, preferencesSchema)
    expect(result.valid).toBe(false)
  })
})

describe('Memo Schemas', () => {
  const createSchema = {
    title: { type: 'string', maxLength: 500 },
    audio_url: { type: 'url', required: true, protocols: ['https'] },
    transcript: { type: 'string', maxLength: 100000 },
    duration: { type: 'number', min: 0, max: 36000 }
  }

  it('allows valid memo creation', () => {
    const result = validateData(
      { audio_url: 'https://example.com/audio.mp3', title: 'My memo' },
      createSchema
    )
    expect(result.valid).toBe(true)
  })

  it('rejects missing audio_url', () => {
    const result = validateData({ title: 'No audio' }, createSchema)
    expect(result.valid).toBe(false)
  })

  it('rejects non-https audio_url', () => {
    const result = validateData({ audio_url: 'http://example.com/audio.mp3' }, createSchema)
    expect(result.valid).toBe(false)
  })

  it('rejects negative duration', () => {
    const result = validateData(
      { audio_url: 'https://example.com/a.mp3', duration: -5 },
      createSchema
    )
    expect(result.valid).toBe(false)
  })
})

describe('Refund Schemas', () => {
  const requestSchema = {
    paymentId: { type: 'integer', min: 1 },
    reason: { type: 'string', maxLength: 2000 },
    type: {
      type: 'string',
      required: true,
      enum: ['guarantee', 'cooling_off', 'faulty', 'other']
    }
  }

  it('allows valid refund request', () => {
    const result = validateData(
      { type: 'guarantee', reason: 'Not satisfied', paymentId: 42 },
      requestSchema
    )
    expect(result.valid).toBe(true)
    expect(result.data.type).toBe('guarantee')
  })

  it('rejects missing type', () => {
    const result = validateData({ reason: 'test' }, requestSchema)
    expect(result.valid).toBe(false)
  })

  it('rejects invalid type enum value', () => {
    const result = validateData({ type: 'invalid_type' }, requestSchema)
    expect(result.valid).toBe(false)
  })

  it('rejects reason exceeding max length', () => {
    const result = validateData({ type: 'other', reason: 'x'.repeat(2001) }, requestSchema)
    expect(result.valid).toBe(false)
  })
})

describe('User Phone Settings Schema', () => {
  const phoneSchema = {
    phoneNumber: {
      type: 'string',
      maxLength: 16,
      pattern: /^\+[1-9]\d{6,14}$/,
      patternMessage: 'must be in E.164 format'
    },
    phoneCallConsent: { type: 'boolean' },
    contactPreference: { type: 'string', enum: ['email', 'phone', 'both'] }
  }

  it('allows valid E.164 phone number', () => {
    const result = validateData(
      { phoneNumber: '+447700900000', phoneCallConsent: true, contactPreference: 'phone' },
      phoneSchema
    )
    expect(result.valid).toBe(true)
  })

  it('rejects invalid phone format', () => {
    const result = validateData({ phoneNumber: '07700900000' }, phoneSchema)
    expect(result.valid).toBe(false)
  })

  it('rejects invalid contact preference', () => {
    const result = validateData({ contactPreference: 'telegram' }, phoneSchema)
    expect(result.valid).toBe(false)
  })
})
