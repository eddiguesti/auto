import mapping from '../db/mapping.json' with { type: 'json' }

// Storage stays lossless. API dates intentionally match pg Date JSON (millisecond
// ISO strings); interpreting a TIMESTAMP wall clock requires an explicit policy.
export function timestampToApi(value, kind, wallClockTimeZone) {
  if (value === null) return null
  if (typeof value !== 'string') throw new TypeError('Invalid stored timestamp')
  const wall = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d{1,6})?$/
  const instant = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d{1,6})?(?:\+00(?::?00)?|Z)$/
  const match = (kind === 'instant' ? instant : wall).exec(value)
  if (!match || (kind === 'timestamp' && wallClockTimeZone !== 'UTC')) {
    throw new TypeError('Stored timestamp needs a verified UTC wall-clock policy')
  }
  const date = new Date(`${match[1]}T${match[2]}${match[3] || ''}Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1])
    throw new TypeError('Invalid stored timestamp')
  return date.toISOString()
}

export function timestampForStorage(date, kind = 'timestamp') {
  const value = new Date(date).toISOString().replace('T', ' ').replace('Z', '')
  return kind === 'instant' ? `${value}+00` : value
}

export function decodeJsonForApi(text) {
  return JSON.parse(text, (_key, value) => {
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
    ) {
      throw new TypeError('JSON number cannot be represented exactly in the API')
    }
    return value
  })
}

export function createMappedCodec(tableName, { wallClockTimeZone } = {}) {
  const table = mapping.tables.find(candidate => candidate.name === tableName)
  if (!table) throw new TypeError(`Unmapped table: ${tableName}`)
  const columns = new Map(table.columns.map(column => [column.name, column]))
  function columnFor(name) {
    const column = columns.get(name)
    if (!column) throw new TypeError(`Unmapped column: ${tableName}.${name}`)
    return column
  }
  return {
    decodeRow(row) {
      if (!row) return null
      return Object.fromEntries(
        Object.entries(row).map(([name, value]) => {
          const { kind } = columnFor(name)
          if (value === null) return [name, null]
          if (kind === 'boolean') {
            if (value !== 0 && value !== 1) throw new TypeError('Invalid stored boolean')
            return [name, value === 1]
          }
          if (kind === 'timestamp' || kind === 'instant')
            return [name, timestampToApi(value, kind, wallClockTimeZone)]
          if (kind === 'json' || kind === 'text-array') return [name, decodeJsonForApi(value)]
          // PostgreSQL numeric is returned as text. Preserve it instead of coercing
          // an exact decimal into binary floating point; all int4 IDs remain safe.
          return [name, value]
        })
      )
    },
    encode(name, value) {
      const { kind, nullable } = columnFor(name)
      if (value === null) {
        if (!nullable) throw new TypeError('Required mapped value is null')
        return null
      }
      if (kind === 'boolean') {
        if (typeof value !== 'boolean') throw new TypeError('Boolean required')
        return value ? 1 : 0
      }
      if (kind === 'json' || kind === 'text-array') {
        // Accept reviewed JSON text so callers need not round-trip large numbers.
        if (typeof value !== 'string') throw new TypeError('Exact JSON text required')
        if (kind === 'text-array') {
          const decoded = decodeJsonForApi(value)
          if (
            !Array.isArray(decoded) ||
            decoded.some(item => item !== null && typeof item !== 'string')
          )
            throw new TypeError('Text array required')
        } else JSON.parse(value)
        return value
      }
      if (kind === 'timestamp' || kind === 'instant') {
        timestampToApi(value, kind, wallClockTimeZone)
        return value // Never truncate the stored microseconds.
      }
      if (
        kind === 'integer' &&
        (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
      )
        throw new TypeError('int4 value required')
      if (kind === 'decimal' && (typeof value !== 'string' || !/^-?\d\.\d{2}$/.test(value)))
        throw new TypeError('Exact decimal text required')
      return value
    }
  }
}
