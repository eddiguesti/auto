/**
 * Simple in-memory metrics collection for production observability
 * Tracks request latency, DB query timing, and error rates
 */

const HISTOGRAM_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

class Histogram {
  constructor(name, buckets = HISTOGRAM_BUCKETS) {
    this.name = name
    this.buckets = buckets
    this.values = []
    this.sum = 0
    this.count = 0
    this.bucketCounts = Object.fromEntries(buckets.map(b => [b, 0]))
    this.bucketCounts['+Inf'] = 0
  }

  observe(value) {
    this.values.push(value)
    this.sum += value
    this.count++

    // Keep only last 1000 values to prevent memory growth
    if (this.values.length > 1000) {
      const removed = this.values.shift()
      this.sum -= removed
      this.count--
    }

    // Increment bucket counters
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        this.bucketCounts[bucket]++
        return
      }
    }
    this.bucketCounts['+Inf']++
  }

  getStats() {
    if (this.count === 0) {
      return { count: 0, mean: 0, p50: 0, p95: 0, p99: 0 }
    }

    const sorted = [...this.values].sort((a, b) => a - b)
    const p50Index = Math.floor(sorted.length * 0.5)
    const p95Index = Math.floor(sorted.length * 0.95)
    const p99Index = Math.floor(sorted.length * 0.99)

    return {
      count: this.count,
      mean: Math.round(this.sum / this.count),
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    }
  }

  reset() {
    this.values = []
    this.sum = 0
    this.count = 0
    this.bucketCounts = Object.fromEntries(this.buckets.map(b => [b, 0]))
    this.bucketCounts['+Inf'] = 0
  }
}

class Counter {
  constructor(name) {
    this.name = name
    this.value = 0
    this.labels = new Map()
  }

  inc(labels = {}, amount = 1) {
    this.value += amount
    const key = JSON.stringify(labels)
    this.labels.set(key, (this.labels.get(key) || 0) + amount)
  }

  get() {
    return this.value
  }

  getByLabel() {
    const result = {}
    for (const [key, value] of this.labels) {
      result[key] = value
    }
    return result
  }

  reset() {
    this.value = 0
    this.labels.clear()
  }
}

// Global metrics store
const metrics = {
  // Request latency by route
  httpRequestDuration: new Histogram('http_request_duration_ms'),

  // DB query timing
  dbQueryDuration: new Histogram('db_query_duration_ms'),

  // Request counters
  httpRequestsTotal: new Counter('http_requests_total'),
  httpErrorsTotal: new Counter('http_errors_total'),

  // DB counters
  dbQueriesTotal: new Counter('db_queries_total'),
  dbErrorsTotal: new Counter('db_errors_total'),

  // External service errors
  externalServiceErrors: new Counter('external_service_errors_total'),

  // Grok API timing
  grokApiDuration: new Histogram('grok_api_duration_ms'),
  grokApiCalls: new Counter('grok_api_calls_total'),
  grokApiErrors: new Counter('grok_api_errors_total'),

  // Server start time for uptime calculation
  startTime: Date.now()
}

/**
 * Record HTTP request metrics
 * @param {string} method - HTTP method
 * @param {string} route - Route path
 * @param {number} statusCode - Response status code
 * @param {number} durationMs - Request duration in milliseconds
 */
export function recordHttpRequest(method, route, statusCode, durationMs) {
  metrics.httpRequestDuration.observe(durationMs)
  metrics.httpRequestsTotal.inc({ method, route, status: statusCode })

  if (statusCode >= 400) {
    metrics.httpErrorsTotal.inc({ method, route, status: statusCode })
  }
}

/**
 * Record database query metrics
 * @param {string} operation - Query operation type (SELECT, INSERT, etc.)
 * @param {number} durationMs - Query duration in milliseconds
 * @param {boolean} success - Whether query succeeded
 */
export function recordDbQuery(operation, durationMs, success = true) {
  metrics.dbQueryDuration.observe(durationMs)
  metrics.dbQueriesTotal.inc({ operation })

  if (!success) {
    metrics.dbErrorsTotal.inc({ operation })
  }
}

/**
 * Record external service error
 * @param {string} service - Service name (grok, stripe, etc.)
 * @param {string} error - Error type or message
 */
export function recordExternalError(service, error) {
  metrics.externalServiceErrors.inc({ service, error: error.substring(0, 50) })
}

/**
 * Record Grok API call metrics
 * @param {number} durationMs - API call duration
 * @param {boolean} success - Whether call succeeded
 */
export function recordGrokCall(durationMs, success = true) {
  metrics.grokApiDuration.observe(durationMs)
  metrics.grokApiCalls.inc({ success })

  if (!success) {
    metrics.grokApiErrors.inc()
  }
}

/**
 * Get all metrics summary
 * @returns {Object} Metrics summary
 */
export function getMetricsSummary() {
  return {
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    http: {
      requests: metrics.httpRequestsTotal.get(),
      errors: metrics.httpErrorsTotal.get(),
      latency: metrics.httpRequestDuration.getStats()
    },
    database: {
      queries: metrics.dbQueriesTotal.get(),
      errors: metrics.dbErrorsTotal.get(),
      latency: metrics.dbQueryDuration.getStats()
    },
    grok: {
      calls: metrics.grokApiCalls.get(),
      errors: metrics.grokApiErrors.get(),
      latency: metrics.grokApiDuration.getStats()
    },
    externalErrors: metrics.externalServiceErrors.getByLabel()
  }
}

/**
 * Get detailed metrics by label
 * @returns {Object} Detailed metrics breakdown
 */
export function getDetailedMetrics() {
  return {
    http: {
      requestsByRoute: metrics.httpRequestsTotal.getByLabel(),
      errorsByRoute: metrics.httpErrorsTotal.getByLabel()
    },
    database: {
      queriesByOperation: metrics.dbQueriesTotal.getByLabel(),
      errorsByOperation: metrics.dbErrorsTotal.getByLabel()
    }
  }
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  metrics.httpRequestDuration.reset()
  metrics.httpRequestsTotal.reset()
  metrics.httpErrorsTotal.reset()
  metrics.dbQueryDuration.reset()
  metrics.dbQueriesTotal.reset()
  metrics.dbErrorsTotal.reset()
  metrics.externalServiceErrors.reset()
  metrics.grokApiDuration.reset()
  metrics.grokApiCalls.reset()
  metrics.grokApiErrors.reset()
}

export default metrics
