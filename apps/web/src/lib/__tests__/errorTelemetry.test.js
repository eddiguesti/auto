import { describe, it, expect } from 'vitest'
import {
  safeTelemetryUrl,
  scrubErrorBreadcrumb,
  scrubErrorEvent,
  scrubAnalyticsEvent
} from '../errorTelemetry'

describe('private telemetry boundary', () => {
  it('reduces capability, authentication, asset and unknown URLs to safe categories', () => {
    for (const url of [
      'https://memoir.invalid/talk/private-link?token=private-query#private-fragment',
      '/api/magic/private-link/transcript',
      '/api/v1/voice/ws?ticket=private-ticket',
      '/api/support/private-link',
      '/api/photos/file/private-photo',
      '/api/print-files/private-order/text?signature=private-signature',
      '/reset-password?token=private-reset#private-fragment',
      '/unknown/private-path',
      '/talk%2Fprivate-encoded',
      'data:text/plain,private-data'
    ]) {
      const clean = safeTelemetryUrl(url)
      expect(clean).not.toMatch(/private|\?|#|https:|data:/)
    }
    expect(safeTelemetryUrl('https://memoir.invalid/assets/index-build123.js?token=private')).toBe(
      '/assets/index-build123.js'
    )
    expect(safeTelemetryUrl('/chapter/earliest-memories/review?token=private')).toBe(
      '/chapter/[redacted]'
    )
    expect(safeTelemetryUrl('/home?token=private')).toBe('/home')
  })

  it('retains error categories and code positions while removing private error context and attachments', () => {
    const hint = { attachments: [{ data: 'private-attachment' }] }
    const event = scrubErrorEvent(
      {
        event_id: 'a'.repeat(32),
        timestamp: 1,
        level: 'error',
        environment: 'production',
        message: 'private-message',
        user: { email: 'private-email' },
        extra: { memoir: 'private-memoir' },
        tags: { private: 'private-tag' },
        contexts: { react: { props: 'private-props' } },
        request: {
          url: '/api/voice/ws?ticket=private-ticket',
          method: 'POST',
          headers: { Authorization: 'Bearer private-auth' },
          data: 'private-body',
          cookies: 'private-cookie',
          query_string: 'private-query'
        },
        exception: {
          values: [
            {
              type: 'TypeError',
              value: 'private-error',
              stacktrace: {
                frames: [
                  {
                    filename: 'https://memoir.invalid/assets/index-build123.js?token=private-frame',
                    function: 'private-function',
                    vars: { text: 'private-local' },
                    lineno: 12,
                    colno: 3,
                    in_app: true
                  }
                ]
              }
            }
          ]
        },
        breadcrumbs: [
          { category: 'console', message: 'private-log', data: { arguments: ['private-memoir'] } },
          {
            category: 'navigation',
            data: { from: '/talk/private-link', to: '/reset-password?token=private-reset' }
          }
        ]
      },
      hint
    )
    expect(JSON.stringify(event)).not.toContain('private')
    expect(event.exception.values[0]).toEqual({
      type: 'TypeError',
      value: 'TypeError',
      stacktrace: {
        frames: [{ filename: '/assets/index-build123.js', lineno: 12, colno: 3, in_app: true }]
      }
    })
    expect(event.request).toEqual({ url: '/api/voice/[redacted]', method: 'POST' })
    expect(event.breadcrumbs).toHaveLength(1)
    expect(hint.attachments).toEqual([])
    expect(
      scrubErrorEvent({
        exception: { values: [{ type: 'private-custom-type', value: 'private-error' }] }
      }).exception.values[0].type
    ).toBe('Error')
  })

  it('discards console, UI and message breadcrumbs and whitelists HTTP metadata', () => {
    for (const category of ['console', 'ui.click', 'user', 'error'])
      expect(scrubErrorBreadcrumb({ category, message: 'private-message' })).toBeNull()
    expect(
      scrubErrorBreadcrumb({
        category: 'fetch',
        message: 'private-message',
        data: {
          url: '/api/auth/verify-reset-token?token=private-token',
          method: 'GET',
          status_code: 401,
          body: 'private-body',
          headers: { Authorization: 'private-auth' }
        }
      })
    ).toEqual({
      category: 'http',
      type: 'http',
      data: { url: '/api/auth/[redacted]', method: 'GET', status_code: 401 }
    })
  })

  it('scrubs SDK defaults, nested initial URL fields and arbitrary event properties without removing the configured public project key', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const event = scrubAnalyticsEvent(
      {
        uuid: id,
        event: '$pageview',
        timestamp: new Date(0),
        user: 'private-user',
        properties: {
          token: 'private-auth-token',
          distinct_id: id,
          $device_id: id,
          $current_url: 'https://memoir.invalid/talk/private-link?token=private-query',
          $pathname: '/talk/private-link',
          $referrer: 'https://private-company.invalid/private-path?secret=private-query',
          authorization: 'private-auth',
          message: 'private-memoir',
          chapterId: 'earliest-memories',
          productId: 'premium_bundle',
          $set: {
            email: 'private-email',
            $initial_current_url: '/reset-password?token=private-reset'
          },
          $set_once: { $initial_pathname: '/api/voice/private-ticket', memoir: 'private-memoir' }
        },
        $set_once: { $initial_current_url: '/talk/private-link', email: 'private-email' }
      },
      { projectKey: 'public-project-key' }
    )
    expect(JSON.stringify(event)).not.toContain('private')
    expect(event.properties.token).toBe('public-project-key')
    expect(event.properties.distinct_id).toBe(id)
    expect(event.properties.chapterId).toBe('earliest-memories')
    expect(event.properties.$current_url).toBe('/talk/[redacted]')
    expect(event.$set_once).toEqual({ $initial_current_url: '/talk/[redacted]' })
    expect(
      scrubAnalyticsEvent({
        event: 'story_saved',
        properties: {
          distinct_id: 'private-email',
          token: 'private-auth',
          memoir: 'private-memoir'
        }
      })
    ).toEqual({ event: 'story_saved', properties: {} })
  })

  it('scrubs actual Sentry HttpContext and envelope output before its transport receives it', async () => {
    const Sentry = await import('@sentry/browser'),
      envelopes = [],
      previous = window.location.href
    window.history.replaceState({}, '', '/talk/private-link?token=private-query#private-fragment')
    Sentry.init({
      dsn: 'https://public@sentry.invalid/1',
      beforeSend: scrubErrorEvent,
      beforeBreadcrumb: scrubErrorBreadcrumb,
      tracesSampleRate: 0,
      sendClientReports: false,
      transport: () => ({
        send: async envelope => {
          envelopes.push(envelope)
          return { statusCode: 200 }
        },
        flush: async () => true
      })
    })
    try {
      Sentry.addBreadcrumb({ category: 'console', message: 'private-memoir' })
      Sentry.addBreadcrumb({
        category: 'fetch',
        data: {
          url: '/api/auth/verify-reset-token?token=private-token',
          method: 'GET',
          status_code: 400
        }
      })
      Sentry.captureException(new TypeError('private-error-message'), {
        extra: { body: 'private-memoir' },
        attachments: [{ filename: 'private.txt', data: 'private-attachment' }]
      })
      await Sentry.flush(2000)
      expect(envelopes).toHaveLength(1)
      expect(JSON.stringify(envelopes)).not.toContain('private')
      expect(JSON.stringify(envelopes)).toContain('TypeError')
    } finally {
      await Sentry.close(2000)
      window.history.replaceState({}, '', previous)
    }
  })
})
