# TODO 7: UX, Growth Features & Admin

**Priority:** MEDIUM - Do after todo6
**Agent type:** full-stack / product
**Estimated time:** 3-5 days
**Score impact:** Product & Growth 5/10 -> 8/10, UX 6/10 -> 8/10
**Depends on:** todo5 (frontend refactored), todo6 (backend refactored)

## Context

The product has impressive breadth but lacks polish that converts visitors to paying users.
Missing: admin dashboard, blog CMS, proper analytics, conversion-optimized UX.
This phase focuses on features that directly drive growth and retention.

## Tasks

### 7.1 Build Lightweight Admin Dashboard

**Problem:** No admin UI. User management, support, refunds, and metrics require direct DB access.

**Action:**

1. Create admin routes at `services/api/routes/admin.js`:

```javascript
// Admin middleware - check admin flag on user
function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Endpoints needed:
// GET /api/admin/users - paginated user list with search
// GET /api/admin/users/:id - user detail with stories, payments
// POST /api/admin/users/:id/premium - grant/revoke premium
// GET /api/admin/metrics - key metrics (signups, stories, payments)
// GET /api/admin/payments - payment history
// POST /api/admin/refunds/:paymentId - process refund
```

2. Add `is_admin` column to users table (migration):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
```

3. Create admin frontend at `apps/web/src/pages/admin/`:
   - `Dashboard.jsx` - key metrics: total users, active users (7d), stories written, revenue
   - `Users.jsx` - searchable user list, premium status toggle
   - `Payments.jsx` - payment history, refund button

4. Add admin routes to App.jsx (lazy-loaded, admin-only guard)

5. Simple but functional — use Tailwind, no extra UI library needed

**Target:** Operational admin panel showing: user count, active users, revenue, recent signups, user search, premium management.

### 7.2 Move Blog to Markdown/Data System

**Problem:** Blog content hardcoded in 1,339-line JSX. Adding posts requires a developer.

**Action:**

1. Create `apps/web/src/data/blog/` directory
2. Create one JSON file per blog post:

```json
{
  "slug": "how-to-write-memoir",
  "title": "How to Write a Memoir: A Complete Guide",
  "date": "2025-01-15",
  "author": "Easy Memoir Team",
  "category": "Guides",
  "excerpt": "Learn the essential steps...",
  "coverImage": "/images/blog/memoir-guide.jpg",
  "content": "## Introduction\n\nWriting a memoir is..."
}
```

3. Create `apps/web/src/data/blog/index.js` that exports all posts:

```javascript
const posts = import.meta.glob('./*.json', { eager: true })
export const blogPosts = Object.values(posts)
  .map(m => m.default)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
```

4. Install `react-markdown` for rendering:

```bash
cd apps/web && npm install react-markdown
```

5. Rewrite BlogPost.jsx to:
   - Look up post by slug from blogPosts
   - Render markdown content
   - Keep SEO meta tags (Helmet)

6. Update prerender script if it relies on hardcoded blog routes

**Target:** Adding a blog post = creating a JSON file. No code changes needed.

### 7.3 Improve Onboarding & First-Time UX

**Problem:** Several UX gaps hurt conversion for the target audience (seniors).

**Action:**

1. **Add countdown timer to voice recording:**
   - In VoiceChat (or useVoiceSession hook), show remaining seconds
   - Display "Recording will end in X seconds" when under 10s remaining
   - Visual indicator (progress bar or countdown circle)

2. **Add proper empty states:**
   - Home page with no stories → "Start your first chapter" CTA with illustration
   - Chapter page with no answers → "This chapter is waiting for your story" with prompt
   - Export page with insufficient content → "Write X more stories to unlock export"

3. **Replace all `alert()` calls with toast/modal:**
   - Search codebase for `alert(`
   - Replace with a lightweight toast component
   - Create `apps/web/src/components/Toast.jsx` (or install `react-hot-toast`)

4. **Add progress persistence indicator:**
   - During voice interview, show "Your story is being saved" after each answer
   - Add auto-save indicator (like Google Docs "All changes saved")

5. **Show social proof on pricing page:**
   - Add testimonial section
   - Show number of stories written ("Join 500+ families preserving their memories")
   - Add trust badges (SSL, secure payment)

### 7.4 Add Error Boundary with Recovery

**Problem:** If any component crashes, the entire app goes white. Sentry catches it but user sees nothing.

**Action:**

1. Create `apps/web/src/components/ErrorBoundary.jsx`:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Report to Sentry
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: info })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-parchment">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-display text-ink mb-4">Something went wrong</h2>
            <p className="text-ink/70 mb-6">
              We're sorry for the inconvenience. Your stories are safe.
            </p>
            <button
              onClick={() => (window.location.href = '/home')}
              className="px-6 py-3 bg-primary text-white rounded-xl"
            >
              Return Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

2. Wrap the App component in ErrorBoundary
3. Add page-level error boundaries for critical routes (VoiceChat, Export, BookOrder)

### 7.5 Add Analytics Events

**Problem:** No visibility into user behavior. Can't measure conversion, drop-off, or feature usage.

**Action:**

1. Create `apps/web/src/utils/analytics.js`:

```javascript
export function trackEvent(name, properties = {}) {
  // PostHog, Mixpanel, or simple API endpoint
  if (window.posthog) {
    window.posthog.capture(name, properties)
  }
  // Fallback: send to own API
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: name, properties, timestamp: Date.now() })
  }).catch(() => {}) // Fire and forget
}
```

2. Add tracking to key conversion events:
   - `page_view` (all pages)
   - `signup_started`, `signup_completed`
   - `onboarding_started`, `onboarding_completed`, `onboarding_step_{n}`
   - `voice_interview_started`, `voice_interview_completed`
   - `story_saved`
   - `export_initiated`, `export_completed`
   - `book_order_started`, `book_order_completed`
   - `premium_upgrade_clicked`, `premium_upgrade_completed`
   - `pricing_page_viewed`

3. Create simple analytics endpoint on backend (or integrate PostHog)

**Target:** Can answer: "How many users start onboarding? How many complete it? Where do they drop off?"

### 7.6 Add Notification/Reminder System

**Problem:** Users start memoir but don't return. No re-engagement mechanism.

**Action:**

1. Weekly email reminder for users with incomplete memoirs:
   - "You have 3 chapters waiting for your stories"
   - Include a magic link to resume where they left off
   - Respect notification preferences (already have preferences table)

2. Backend: extend existing `cron/weeklyTasks.js` with reminder logic:

```javascript
// Find users who haven't written in 7+ days with incomplete memoirs
const inactiveUsers = await pool.query(`
  SELECT u.id, u.email, u.name,
    (SELECT COUNT(*) FROM stories WHERE user_id = u.id) as story_count
  FROM users u
  WHERE u.id NOT IN (
    SELECT user_id FROM stories
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
  )
  AND (SELECT COUNT(*) FROM stories WHERE user_id = u.id) < 16
  AND u.email IS NOT NULL
  LIMIT 50
`)
```

3. Generate magic links for each user and send via existing email service

**Verification:** Inactive users receive weekly reminder with magic link to resume.

## Definition of Done

- [ ] Admin dashboard operational: metrics, user search, premium management
- [ ] Blog moved to JSON/Markdown system (adding post = adding file)
- [ ] Countdown timer on voice recording
- [ ] Empty states on Home, Chapter, Export pages
- [ ] All alert() replaced with toast/modal
- [ ] Progress indicator during voice interview
- [ ] Error boundaries on App and critical pages
- [ ] Analytics events on 10+ key conversion points
- [ ] Weekly reminder emails for inactive users
- [ ] No visual regressions
