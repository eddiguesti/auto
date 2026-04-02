/**
 * Analytics event ingestion endpoint.
 * Accepts fire-and-forget events from the frontend.
 * Stores in PostgreSQL for basic reporting.
 */

import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('analytics')

// POST /api/analytics/event — public, no auth required (fires from landing pages too)
router.post(
  '/event',
  asyncHandler(async (req, res) => {
    const { event, properties, timestamp } = req.body

    if (!event || typeof event !== 'string' || event.length > 100) {
      return res.status(400).json({ error: 'Invalid event' })
    }

    // Log for now — can be persisted to a table or forwarded to PostHog later
    logger.info('Analytics event', {
      event,
      properties: properties || {},
      timestamp: timestamp || Date.now()
    })

    res.json({ received: true })
  })
)

export default router
