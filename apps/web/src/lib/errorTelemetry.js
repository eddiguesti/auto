import { chapters } from '../../../../packages/shared/chapters.js'
import { PRODUCTS } from '../../../../packages/shared/payment-catalog.js'

const chapterIds = new Set(chapters.map(chapter => chapter.id))
const pages = new Set([
  'home',
  'settings',
  'export',
  'preview-style',
  'voice',
  'quick-story',
  'call-me',
  'photo',
  'pricing',
  'blog',
  'about',
  'privacy',
  'terms',
  'register',
  'login',
  'forgot-password',
  'reset-password',
  'verify-email'
])
const areas = new Set([
  'auth',
  'magic',
  'voice',
  'support',
  'telnyx',
  'notifications',
  'newsletter',
  'stories',
  'photos',
  'chapter-images',
  'print',
  'print-files',
  'payments',
  'refunds',
  'admin',
  'style',
  'chapter-review',
  'free-stories',
  'memos',
  'ai',
  'game',
  'export',
  'audiobook',
  'covers',
  'analytics'
])
const names = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'AggregateError',
  'DOMException',
  'AbortError',
  'ApiError',
  'NetworkError',
  'TimeoutError',
  'NotAllowedError',
  'NotFoundError',
  'SecurityError',
  'QuotaExceededError',
  'UnhandledRejection'
])
const levels = new Set(['fatal', 'error', 'warning', 'info', 'debug'])
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const uuid = value =>
  typeof value === 'string' &&
  /^(?:\$device:)?[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)
const boundedInteger = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max

// Return only an allowlisted route category. Origins, arbitrary path segments,
// all query strings/fragments and capability/object identifiers never survive.
export function safeTelemetryUrl(value) {
  if (typeof value !== 'string' || value.length > 8192) return '/[redacted]'
  try {
    const url = new URL(value, 'https://telemetry.invalid')
    if (!['https:', 'http:', 'ws:', 'wss:'].includes(url.protocol)) return '/[redacted]'
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/'
    if (path === '/') return '/'
    if (/^\/assets\/[A-Za-z0-9_-]{1,120}\.(?:js|css)$/.test(path)) return path
    if (pages.has(path.slice(1))) return path
    if (/^\/talk(?:\/|$)/.test(path)) return '/talk/[redacted]'
    if (/^\/chapter(?:\/|$)/.test(path)) return '/chapter/[redacted]'
    if (/^\/blog\//.test(path)) return '/blog/[redacted]'
    if (/^\/admin(?:\/|$)/.test(path)) return '/admin/[redacted]'
    const api = /^\/api(?:\/v1)?\/([^/]+)(?:\/|$)/.exec(path)
    if (api) return areas.has(api[1]) ? `/api/${api[1]}/[redacted]` : '/api/[redacted]'
  } catch {
    /* Malformed or encoded URLs are private by default. */
  }
  return '/[redacted]'
}

export function scrubErrorBreadcrumb(crumb) {
  if (!crumb || typeof crumb !== 'object') return null
  if (crumb.category === 'navigation')
    return {
      category: 'navigation',
      data: { from: safeTelemetryUrl(crumb.data?.from), to: safeTelemetryUrl(crumb.data?.to) }
    }
  if (crumb.category === 'fetch' || crumb.category === 'xhr' || crumb.category === 'http') {
    const data = { url: safeTelemetryUrl(crumb.data?.url) }
    if (methods.has(crumb.data?.method)) data.method = crumb.data.method
    if (boundedInteger(crumb.data?.status_code, 599)) data.status_code = crumb.data.status_code
    return { category: 'http', type: 'http', data }
  }
  // Console arguments, click labels, DOM selectors and user messages may be
  // memoir/support content. They have no useful safe generic representation.
  return null
}

export function scrubErrorEvent(event, hint) {
  if (!event || typeof event !== 'object') return null
  if (hint && typeof hint === 'object') hint.attachments = []
  const result = { platform: 'javascript', level: levels.has(event.level) ? event.level : 'error' }
  if (typeof event.event_id === 'string' && /^[a-f0-9]{32}$/.test(event.event_id))
    result.event_id = event.event_id
  if (typeof event.timestamp === 'number' && Number.isFinite(event.timestamp))
    result.timestamp = event.timestamp
  if (['production', 'development', 'staging', 'test'].includes(event.environment))
    result.environment = event.environment
  if (event.request && typeof event.request === 'object') {
    result.request = { url: safeTelemetryUrl(event.request.url) }
    if (methods.has(event.request.method)) result.request.method = event.request.method
  }
  const exceptions = Array.isArray(event.exception?.values)
    ? event.exception.values.slice(0, 5)
    : []
  if (exceptions.length)
    result.exception = {
      values: exceptions.map(value => {
        const type = names.has(value?.type) ? value.type : 'Error'
        const clean = { type, value: type }
        const frames = Array.isArray(value?.stacktrace?.frames)
          ? value.stacktrace.frames.slice(-30)
          : []
        if (frames.length)
          clean.stacktrace = {
            frames: frames.map(frame => {
              const result = { filename: safeTelemetryUrl(frame?.filename) }
              if (boundedInteger(frame?.lineno, 10_000_000)) result.lineno = frame.lineno
              if (boundedInteger(frame?.colno, 10_000_000)) result.colno = frame.colno
              if (typeof frame?.in_app === 'boolean') result.in_app = frame.in_app
              return result
            })
          }
        return clean
      })
    }
  else result.message = 'Application error'
  if (Array.isArray(event.breadcrumbs))
    result.breadcrumbs = event.breadcrumbs.slice(-30).map(scrubErrorBreadcrumb).filter(Boolean)
  // Exclude message text, extras, tags, contexts, user, headers, bodies, cookies,
  // locals, attachments and arbitrary top-level fields by construction.
  return result
}

const urlProperties = new Set([
  'url',
  'page',
  'referrer',
  '$current_url',
  '$initial_current_url',
  '$pathname',
  '$initial_pathname',
  '$referrer',
  '$initial_referrer',
  '$entry_current_url',
  '$entry_pathname',
  '$session_entry_url'
])
function analyticsProperties(input, { projectKey, transport = false } = {}) {
  const clean = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return clean
  for (const [key, value] of Object.entries(input)) {
    if (urlProperties.has(key)) clean[key] = safeTelemetryUrl(value)
    else if (key === 'chapterId' && chapterIds.has(value)) clean[key] = value
    else if (key === 'productId' && typeof value === 'string' && Object.hasOwn(PRODUCTS, value))
      clean[key] = value
    else if (key === 'type' && ['epub', 'audiobook', 'pdf', 'print'].includes(value))
      clean[key] = value
    else if (['step', 'questionsAnswered'].includes(key) && boundedInteger(value, 10000))
      clean[key] = value
    else if (
      key === 'total' &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1_000_000
    )
      clean[key] = value
    else if (
      transport &&
      ['distinct_id', '$device_id', '$session_id', '$window_id'].includes(key) &&
      uuid(value)
    )
      clean[key] = value
    else if (transport && key === '$process_person_profile' && typeof value === 'boolean')
      clean[key] = value
    else if (['$set', '$set_once'].includes(key)) {
      const nested = {}
      if (value && typeof value === 'object' && !Array.isArray(value))
        for (const [name, field] of Object.entries(value))
          if (urlProperties.has(name)) nested[name] = safeTelemetryUrl(field)
      if (Object.keys(nested).length) clean[key] = nested
    }
  }
  // This is PostHog's public ingestion project key, never an arbitrary event
  // property named token. Removing it would make the SDK reject every event.
  if (transport && typeof projectKey === 'string' && projectKey.length <= 200)
    clean.token = projectKey
  return clean
}

export function scrubAnalyticsEvent(event, { projectKey } = {}) {
  if (!event || typeof event.event !== 'string' || !/^\$?[a-z][a-z0-9_]{0,79}$/.test(event.event))
    return null
  const result = { event: event.event }
  if (event.properties !== undefined)
    result.properties = analyticsProperties(event.properties, {
      projectKey,
      transport: Boolean(projectKey)
    })
  for (const key of ['$set', '$set_once'])
    if (event[key]) {
      const clean = analyticsProperties({ [key]: event[key] })[key]
      if (clean) result[key] = clean
    }
  if (uuid(event.uuid)) result.uuid = event.uuid
  if (event.timestamp !== undefined) {
    const date = new Date(event.timestamp)
    if (Number.isFinite(date.getTime())) result.timestamp = date.toISOString()
  }
  return result
}
