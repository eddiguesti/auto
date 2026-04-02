// @ts-check
/**
 * CSP violation report endpoint.
 * Receives reports from browsers when a Content Security Policy violation occurs.
 * Public — no authentication. Rate limiting is handled by the global limiter.
 *
 * Violations are logged for monitoring. In production, wire these to Sentry
 * or a log aggregator to get alerted on CSP regressions.
 */

import { Router } from 'express'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('csp-report')

/**
 * Receive a CSP violation report.
 * Browser sends either:
 *   - application/csp-report (legacy report-uri, body has { csp-report: {...} })
 *   - application/reports+json (modern Reporting API, body is array of report objects)
 */
router.post('/', (req, res) => {
  const body = req.body

  try {
    if (Array.isArray(body)) {
      // Modern Reporting API format
      for (const report of body) {
        if (report.type === 'csp-violation') {
          logger.warn('CSP violation (Reporting API)', {
            blockedUri: report.body?.blockedURL,
            violatedDirective: report.body?.effectiveDirective,
            documentUri: report.body?.documentURL,
            disposition: report.body?.disposition
          })
        }
      }
    } else if (body?.['csp-report']) {
      // Legacy report-uri format
      const report = body['csp-report']
      logger.warn('CSP violation (report-uri)', {
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        documentUri: report['document-uri'],
        disposition: report['disposition']
      })
    }
  } catch (err) {
    logger.error('Failed to parse CSP report', { error: err.message })
  }

  // Always respond 204 — browsers don't expect a body
  res.status(204).end()
})

export default router
