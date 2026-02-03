/**
 * Request validation middleware with schema support
 * Provides strict input validation, sanitization, and consistent error responses
 */

// Field type validators
const validators = {
  string: (value, opts = {}) => {
    if (typeof value !== 'string') return { valid: false, error: 'must be a string' }

    let sanitized = value
    if (opts.trim !== false) sanitized = sanitized.trim()
    if (opts.lowercase) sanitized = sanitized.toLowerCase()

    if (opts.minLength && sanitized.length < opts.minLength) {
      return { valid: false, error: `must be at least ${opts.minLength} characters` }
    }
    if (opts.maxLength && sanitized.length > opts.maxLength) {
      return { valid: false, error: `must be at most ${opts.maxLength} characters` }
    }
    if (opts.pattern && !opts.pattern.test(sanitized)) {
      return { valid: false, error: opts.patternMessage || 'invalid format' }
    }
    if (opts.enum && !opts.enum.includes(sanitized)) {
      return { valid: false, error: `must be one of: ${opts.enum.join(', ')}` }
    }

    return { valid: true, value: sanitized }
  },

  email: (value) => {
    if (typeof value !== 'string') return { valid: false, error: 'must be a string' }
    const sanitized = value.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitized)) {
      return { valid: false, error: 'must be a valid email address' }
    }
    if (sanitized.length > 254) {
      return { valid: false, error: 'email too long' }
    }
    return { valid: true, value: sanitized }
  },

  integer: (value, opts = {}) => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value
    if (!Number.isInteger(num)) return { valid: false, error: 'must be an integer' }
    if (opts.min !== undefined && num < opts.min) {
      return { valid: false, error: `must be at least ${opts.min}` }
    }
    if (opts.max !== undefined && num > opts.max) {
      return { valid: false, error: `must be at most ${opts.max}` }
    }
    return { valid: true, value: num }
  },

  number: (value, opts = {}) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (typeof num !== 'number' || isNaN(num)) {
      return { valid: false, error: 'must be a number' }
    }
    if (opts.min !== undefined && num < opts.min) {
      return { valid: false, error: `must be at least ${opts.min}` }
    }
    if (opts.max !== undefined && num > opts.max) {
      return { valid: false, error: `must be at most ${opts.max}` }
    }
    return { valid: true, value: num }
  },

  boolean: (value) => {
    if (typeof value === 'boolean') return { valid: true, value }
    if (value === 'true') return { valid: true, value: true }
    if (value === 'false') return { valid: true, value: false }
    return { valid: false, error: 'must be a boolean' }
  },

  array: (value, opts = {}) => {
    if (!Array.isArray(value)) return { valid: false, error: 'must be an array' }
    if (opts.minLength && value.length < opts.minLength) {
      return { valid: false, error: `must have at least ${opts.minLength} items` }
    }
    if (opts.maxLength && value.length > opts.maxLength) {
      return { valid: false, error: `must have at most ${opts.maxLength} items` }
    }
    // Validate each item if itemType specified
    if (opts.itemType && validators[opts.itemType]) {
      const validatedItems = []
      for (let i = 0; i < value.length; i++) {
        const result = validators[opts.itemType](value[i], opts.itemOpts || {})
        if (!result.valid) {
          return { valid: false, error: `item ${i}: ${result.error}` }
        }
        validatedItems.push(result.value)
      }
      return { valid: true, value: validatedItems }
    }
    return { valid: true, value }
  },

  url: (value, opts = {}) => {
    if (typeof value !== 'string') return { valid: false, error: 'must be a string' }
    const sanitized = value.trim()
    try {
      const url = new URL(sanitized)
      if (opts.protocols && !opts.protocols.includes(url.protocol.replace(':', ''))) {
        return { valid: false, error: `must use protocol: ${opts.protocols.join(' or ')}` }
      }
      return { valid: true, value: sanitized }
    } catch {
      return { valid: false, error: 'must be a valid URL' }
    }
  },

  uuid: (value) => {
    if (typeof value !== 'string') return { valid: false, error: 'must be a string' }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      return { valid: false, error: 'must be a valid UUID' }
    }
    return { valid: true, value: value.toLowerCase() }
  },

  slug: (value, opts = {}) => {
    if (typeof value !== 'string') return { valid: false, error: 'must be a string' }
    const sanitized = value.trim().toLowerCase()
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(sanitized)) {
      return { valid: false, error: 'must be a valid slug (lowercase letters, numbers, hyphens)' }
    }
    if (opts.maxLength && sanitized.length > opts.maxLength) {
      return { valid: false, error: `must be at most ${opts.maxLength} characters` }
    }
    return { valid: true, value: sanitized }
  }
}

/**
 * Validate a value against a field schema
 */
function validateField(value, schema, fieldName) {
  // Handle optional fields
  if (value === undefined || value === null || value === '') {
    if (schema.required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    if (schema.default !== undefined) {
      return { valid: true, value: schema.default }
    }
    return { valid: true, value: undefined }
  }

  // Get validator
  const validator = validators[schema.type]
  if (!validator) {
    return { valid: false, error: `unknown type: ${schema.type}` }
  }

  // Validate
  const result = validator(value, schema)
  if (!result.valid) {
    return { valid: false, error: `${fieldName} ${result.error}` }
  }

  // Custom validator
  if (schema.validate) {
    const customResult = schema.validate(result.value)
    if (customResult !== true) {
      return { valid: false, error: `${fieldName} ${customResult || 'is invalid'}` }
    }
  }

  return result
}

/**
 * Validate request data against a schema
 * @param {object} data - The data to validate
 * @param {object} schema - Schema definition
 * @param {object} options - Validation options
 * @returns {{ valid: boolean, data?: object, errors?: string[] }}
 */
export function validateData(data, schema, options = {}) {
  const errors = []
  const validated = {}
  const allowedFields = new Set(Object.keys(schema))

  // Check for unexpected fields (reject by default)
  if (options.rejectUnknown !== false) {
    for (const key of Object.keys(data || {})) {
      if (!allowedFields.has(key)) {
        errors.push(`unexpected field: ${key}`)
      }
    }
  }

  // Validate each field in schema
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const result = validateField(data?.[fieldName], fieldSchema, fieldName)
    if (!result.valid) {
      errors.push(result.error)
    } else if (result.value !== undefined) {
      validated[fieldName] = result.value
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: validated }
}

/**
 * Create validation middleware for Express routes
 * @param {object} schemas - { body?: schema, params?: schema, query?: schema }
 * @param {object} options - Middleware options
 */
export function validate(schemas, options = {}) {
  return (req, res, next) => {
    const allErrors = []

    // Validate body
    if (schemas.body) {
      const result = validateData(req.body, schemas.body, options)
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `body: ${e}`))
      } else {
        req.validatedBody = result.data
      }
    }

    // Validate params
    if (schemas.params) {
      const result = validateData(req.params, schemas.params, { ...options, rejectUnknown: false })
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `params: ${e}`))
      } else {
        req.validatedParams = result.data
      }
    }

    // Validate query
    if (schemas.query) {
      const result = validateData(req.query, schemas.query, { ...options, rejectUnknown: false })
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `query: ${e}`))
      } else {
        req.validatedQuery = result.data
      }
    }

    if (allErrors.length > 0) {
      // Return first error only (don't leak schema details)
      return res.status(400).json({
        error: 'Validation failed',
        message: allErrors[0]
      })
    }

    next()
  }
}

/**
 * Common schema definitions for reuse
 */
export const commonSchemas = {
  // Pagination
  pagination: {
    limit: { type: 'integer', min: 1, max: 100, default: 50 },
    offset: { type: 'integer', min: 0, default: 0 }
  },

  // ID parameters
  id: { type: 'integer', required: true, min: 1 },

  // Chapter/question IDs (slug format)
  chapterId: { type: 'slug', required: true, maxLength: 50 },
  questionId: { type: 'slug', required: true, maxLength: 50 },

  // Text content
  shortText: { type: 'string', maxLength: 255 },
  longText: { type: 'string', maxLength: 50000 },

  // Email
  email: { type: 'email', required: true },

  // Password (for auth)
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128,
    validate: (v) => {
      if (!/[a-z]/.test(v)) return 'must contain a lowercase letter'
      if (!/[A-Z]/.test(v)) return 'must contain an uppercase letter'
      if (!/[0-9]/.test(v)) return 'must contain a number'
      return true
    }
  }
}

export default validate
