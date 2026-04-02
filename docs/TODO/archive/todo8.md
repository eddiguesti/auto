# TODO 8: Growth Readiness & Observability

**Priority:** MEDIUM - Final phase
**Agent type:** full-stack / devops
**Estimated time:** 2-3 days
**Score impact:** DevEx 7/10 -> 8/10, Overall -> 8/10
**Depends on:** todo7 (analytics, admin in place)

## Context

After phases 1-7, the app is secure, tested, performant, and well-structured.
This final phase adds the infrastructure for confident growth: A/B testing,
SEO optimization, conversion improvements, monitoring, and observability.

This phase puts the app in a position to scale from hundreds to thousands of users
with confidence that issues will be detected before users notice.

## Tasks

### 8.1 Add Monitoring & Alerting

**Problem:** Only Sentry error tracking exists. No uptime monitoring, no performance monitoring, no alerting on error rate spikes.

**Action:**

1. **Uptime monitoring** - Set up Better Stack (free tier) or UptimeRobot:
   - Monitor `https://easymemoir.co.uk/api/health` every 1 minute
   - Alert on 2 consecutive failures (email + Telegram notification)

2. **Enhance health endpoint** (`services/api/index.js`):

```javascript
app.get('/api/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
    uptime: process.uptime()
  }

  try {
    await pool.query('SELECT 1')
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  try {
    await redisGet('health-check')
    checks.redis = 'ok'
  } catch {
    checks.redis = 'unavailable' // Not critical
  }

  const healthy = checks.database === 'ok'
  res.status(healthy ? 200 : 503).json(checks)
})
```

3. **Sentry performance monitoring** - enable in existing config:

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1 // If Sentry profiling available
})
```

4. **Add Sentry alerts:**
   - Alert if error rate > 10 errors/hour
   - Alert if p95 response time > 5s
   - Configure in Sentry dashboard

**Verification:** Health endpoint returns DB and Redis status. Sentry shows transaction traces.

### 8.2 SEO Quick Wins

**Problem:** Prerendering exists but SEO could be improved for organic growth.

**Action:**

1. **Verify prerender output:**
   - Check that prerendered HTML in `dist/` has correct meta tags
   - Verify Open Graph tags on landing pages
   - Verify structured data (JSON-LD) for blog posts

2. **Add JSON-LD structured data to blog posts:**

```javascript
// In BlogPost.jsx (or new blog renderer)
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  datePublished: post.date,
  author: { '@type': 'Organization', name: 'Easy Memoir' },
  publisher: { '@type': 'Organization', name: 'Easy Memoir' }
}
```

3. **Add sitemap generation:**
   - Create `tools/generate-sitemap.js` that outputs `sitemap.xml` to `apps/web/public/`
   - Include all marketing pages, blog posts, legal pages
   - Add to build process: `npm run build && node tools/generate-sitemap.js`

4. **Add robots.txt** to `apps/web/public/`:

```
User-agent: *
Allow: /
Disallow: /home
Disallow: /chapter/
Disallow: /export
Disallow: /settings
Disallow: /api/
Sitemap: https://easymemoir.co.uk/sitemap.xml
```

5. **Verify canonical URLs** on all pages via Helmet/SEO component

**Verification:** Google Search Console shows no errors. Sitemap submitted.

### 8.3 Conversion Optimization

**Problem:** Marketing pages exist but lack conversion-focused elements.

**Action:**

1. **Add exit-intent popup** (desktop only):
   - Show when mouse moves toward browser chrome
   - Offer: "Get 3 free chapters — start your memoir today"
   - Email capture with magic link to start
   - Only show once per session (sessionStorage flag)

2. **Add sticky CTA on landing pages:**
   - After scrolling past the hero section, show a sticky bottom bar
   - "Start Your Free Memoir" button
   - Hide when footer is visible

3. **Improve pricing page:**
   - Add comparison table (Free vs Premium)
   - Highlight "Most Popular" plan
   - Add annual pricing option with savings
   - Add FAQ section below pricing cards
   - Add money-back guarantee badge

4. **Add social proof elements:**
   - Create `apps/web/src/components/marketing/SocialProof.jsx`
   - Show: total memoirs started, families served, stories written
   - Pull real counts from API: `GET /api/seo/stats` (already exists or create)

5. **Optimize CTAs:**
   - Primary CTA: "Start Your Free Memoir" (not "Sign Up")
   - Use action-oriented language throughout
   - Ensure CTA is visible without scrolling on mobile

**Verification:** Landing page has sticky CTA, social proof, and exit-intent popup.

### 8.4 Add A/B Testing Infrastructure

**Problem:** Two landing pages exist with no way to measure which converts better.

**Action:**

1. Install PostHog (free tier, self-hosted option):

```bash
cd apps/web && npm install posthog-js
```

2. Initialize in `apps/web/src/main.jsx`:

```javascript
import posthog from 'posthog-js'

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true
  })
}
```

3. Set up first A/B test: landing page variants:

```javascript
// In App.jsx catch-all route
const landingVariant = posthog.getFeatureFlag('landing-page-variant')
const LandingComponent = landingVariant === 'design1' ? LandingDesign1 : Landing
```

4. Track conversion events through the funnel:
   - Landing page view → Sign up click → Registration complete → First story

**Verification:** PostHog dashboard shows landing page variant distribution and conversion rates.

### 8.5 Add Request Tracing (Lightweight)

**Problem:** Can't trace a request from frontend through API to database to external service.

**Action:**

1. Ensure `requestId` middleware generates IDs for all requests (already exists)
2. Pass request ID to external service calls (Grok, Replicate, Lulu) in headers/metadata
3. Log request ID with every database query:

```javascript
// In timedPool.js or repositories
console.log(`[${requestId}] Query: ${queryName} took ${duration}ms`)
```

4. Return request ID to frontend in response headers:

```javascript
// Already in middleware - verify it's working
res.setHeader('X-Request-Id', req.requestId)
```

5. Frontend: log request ID on errors for support correlation

**Verification:** Can trace a failing request from Sentry error → API logs → DB query.

### 8.6 Add Database Backup Verification

**Problem:** Backup script exists (`tools/backup-db.sh`) but no verification that backups are restorable.

**Action:**

1. Add weekly backup verification cron:

```javascript
// In cron/weeklyTasks.js
// Download latest backup from S3
// Restore to a temporary database
// Run basic integrity checks (table counts, user count)
// Drop temporary database
// Log results
```

2. If S3 backup is not configured, at minimum verify the backup script runs:

```json
// package.json
"backup:verify": "node tools/verify-backup.js"
```

3. Create `tools/verify-backup.js`:

```javascript
// Check that DATABASE_URL is accessible
// Run pg_dump dry-run
// Verify output is non-empty
// Log success/failure to Sentry or console
```

**Verification:** Weekly backup verification runs. Failures alert via Sentry.

### 8.7 Final Hardening Checklist

Run through this checklist to confirm all previous phases are complete:

- [ ] All API keys rotated (todo1)
- [ ] JWT blacklisting works (todo2)
- [ ] All routes have input validation (todo2)
- [ ] Frontend tests pass: `npm run test:web`
- [ ] Backend tests pass: `npm test`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Main bundle < 150KB (todo4)
- [ ] No file over 500 lines (todo5)
- [ ] Migration system works: `npm run migrate:up` (todo6)
- [ ] Admin dashboard shows metrics (todo7)
- [ ] Blog manageable without deploys (todo7)
- [ ] Analytics events firing (todo7)
- [ ] Monitoring alerts set up (this todo)
- [ ] Sitemap submitted to Google (this todo)
- [ ] No CRITICAL or HIGH security findings remain

## Definition of Done

- [ ] Health endpoint returns DB + Redis status
- [ ] Uptime monitoring active with alerts
- [ ] Sentry performance traces enabled
- [ ] Sitemap.xml generated and submitted
- [ ] JSON-LD structured data on blog posts
- [ ] robots.txt blocks private routes
- [ ] Social proof component on landing page
- [ ] Sticky CTA on marketing pages
- [ ] PostHog (or equivalent) A/B testing initialized
- [ ] Request tracing end-to-end
- [ ] Backup verification script exists
- [ ] Final hardening checklist passes

## After This Phase

The webapp should score **8/10** with:

- Secure: All CRITICAL/HIGH issues fixed, validated by tests
- Tested: 60%+ backend coverage, 40%+ frontend, E2E on core flows
- Performant: <150KB main bundle, lazy-loaded heavy components
- Well-structured: No file over 500 lines, repository pattern, migrations
- Growth-ready: Analytics, A/B testing, admin dashboard, SEO, conversion optimization
- Observable: Monitoring, alerting, request tracing, backup verification

**Next horizon (9/10 and beyond):**

- TypeScript migration
- Collaborative editing (family members contribute)
- PWA with offline support
- Advanced AI features (multiple AI models, style transfer)
- International expansion (i18n)
- Revenue optimization (pricing experiments, upsells)
