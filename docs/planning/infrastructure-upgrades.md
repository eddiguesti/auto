# Infrastructure Upgrades — What & Why

Easy Memoir is currently a single Express server doing everything: serving the React app, handling API requests, storing uploads locally, and caching in memory. This works for development but will cause problems as real users sign up. These upgrades make the app faster, more reliable, and ready for ~1,000 users — without overcomplicating things.

**Total monthly cost: ~$10-25** (most services have free tiers)

---

## Current Architecture (Before)

```
User → Railway/Render (1 Express server)
         ├── Serves React SPA
         ├── Handles /api/* requests
         ├── Stores photos in local /uploads folder
         ├── Caches in memory (lost on restart)
         └── Connects to Supabase Postgres
```

**Problems:**

- Server restart = cache gone, uploads gone
- Every request hits the database directly (slow under load)
- Express serving static files wastes API server resources
- No error visibility (console.log only)
- No rate limiting persistence (resets on restart)
- No backups

---

## Target Architecture (After)

```
Cloudflare Pages (free)          Redis / Upstash (free)
  │ serves React SPA               │ cache, rate limits, sessions
  │ cached at edge globally         │
  │                                 │
  └──── Users ──────────────────────┤
                                    │
                         Railway / Render ($7-20/mo)
                            │ Express API only (no static files)
                            │ Sentry error tracking
                            │
                         Supabase Postgres (free/$25)
                            │
                         S3 Bucket ($1/mo)
                            │ user photos & uploads
```

---

## 1. Redis Cache

### What

Add Redis as a shared cache layer between the API and PostgreSQL. The app already has `utils/redis.js` wired up with graceful fallback — if Redis isn't available, everything works as before using in-memory cache.

### Why

- **Speed** — Redis reads are sub-millisecond vs 5-50ms for Postgres queries
- **Persistence** — in-memory cache is lost every time the server restarts or redeploys. Redis keeps it
- **Rate limiting** — currently resets on deploy. With Redis, rate limit counters survive restarts
- **Sessions** — if you ever run 2 API servers, they need shared state. Redis provides that
- **WebSocket pub/sub** — needed later for multi-server phone call / voice features

### What it caches

- Story progress calculations (expensive queries)
- User session data
- Rate limit counters (login attempts, API calls)
- AI response caching (avoid re-calling Grok for identical prompts)

### Setup

1. Create a free Redis database at [upstash.com](https://upstash.com) or [redis.io](https://redis.io) (Redis Cloud)
2. Copy the connection URL
3. Add to `.env`: `REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379`
4. Restart the server — it auto-connects and starts caching

### Cost

- **Upstash free tier:** 10,000 commands/day, 256MB — plenty for 1,000 users
- **Redis Cloud free tier:** 30MB, 30 connections

---

## 2. Cloudflare Pages (Frontend Hosting)

### What

Move the React SPA (`apps/web`) off the Express server and deploy it to Cloudflare Pages. The API server then only handles `/api/*` requests.

### Why

- **Speed** — Cloudflare serves your app from 300+ edge locations worldwide. A user in London gets the app in ~20ms instead of waiting for a round-trip to your server
- **Less server load** — Express stops serving static files (HTML, JS, CSS, images), freeing it up for API work
- **Free SSL** — Cloudflare handles HTTPS automatically
- **Zero downtime deploys** — push to Git, Cloudflare rebuilds. Your API server doesn't restart
- **DDoS protection** — Cloudflare absorbs attacks before they reach your server

### What changes

- Frontend is deployed separately from the API
- Frontend calls the API via `VITE_API_URL` (already configured in `config.js`)
- API allows CORS from the Cloudflare domain via `FRONTEND_URL` env var (already set up)
- `_redirects` file already added for SPA routing on Cloudflare

### Setup

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your Git repo
3. Set build command: `cd apps/web && npm install && npm run build`
4. Set output directory: `apps/web/dist`
5. Add env var: `VITE_API_URL=https://easymemoir.co.uk` (or wherever API lives)
6. Add `FRONTEND_URL=https://easymemoir.pages.dev` to your API's `.env`

### Cost

- **Free** — Cloudflare Pages free tier includes unlimited bandwidth

---

## 3. S3 for File Uploads

### What

Move user photos and voice recordings from the local `uploads/` folder to an S3-compatible bucket (AWS S3, Cloudflare R2, or Backblaze B2).

### Why

- **Persistence** — local `uploads/` folder is wiped every time Railway/Render redeploys. Users lose their photos
- **Scalability** — S3 handles millions of files without thinking about disk space
- **CDN** — serve images through CloudFront or Cloudflare R2 for fast global access
- **Backups** — S3 has built-in redundancy (99.999999999% durability)

### What changes

- `routes/photos.js` upload handler writes to S3 instead of local disk
- Photo URLs become S3/CDN URLs instead of `/uploads/filename`
- The `uploads/` folder becomes unnecessary in production

### Setup

1. Create an S3 bucket (or Cloudflare R2 bucket for simplicity since we're already using Cloudflare)
2. Add credentials to `.env`: `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`
3. Update the photo upload route to use the S3 SDK

### Cost

- **AWS S3:** ~$0.023/GB/month (1,000 users × 50 photos × 2MB = 100GB = ~$2.30/mo)
- **Cloudflare R2:** Free egress, $0.015/GB stored (~$1.50/mo for same)

---

## 4. Sentry Error Tracking

### What

Add Sentry to both the backend and frontend so you know when something breaks — before users tell you.

### Why

- **Visibility** — right now if a route throws an error at 3am, nobody knows unless a user complains
- **Context** — Sentry captures the exact error, stack trace, which user hit it, what request they made
- **Trends** — see if errors are increasing after a deploy
- **Alerting** — get Slack/email notifications when new errors appear

### What's already done

- Backend: `utils/sentry.js` is created and integrated into the error handler
- Frontend: Sentry is initialised in `main.jsx`
- Both are no-ops until you add the DSN — nothing breaks without it

### Setup

1. Go to [sentry.io](https://sentry.io), create a free account
2. Create a Node.js project → copy the DSN → add to `.env` as `SENTRY_DSN`
3. Create a React project → copy the DSN → add to `apps/web/.env` as `VITE_SENTRY_DSN`

### Cost

- **Free tier:** 5,000 errors/month — more than enough

---

## 5. Database Backups

### What

Automated daily PostgreSQL backups, compressed and stored either locally or in S3.

### Why

- **Disaster recovery** — if the database gets corrupted or someone accidentally deletes data, you can restore
- **Peace of mind** — you're storing people's life stories. Losing them is unforgivable

### What's already done

- `tools/scripts/backup-db.sh` is created
- Supports local backups (7-day retention) and S3 upload (30-day retention)

### Setup

1. Test locally: `./tools/scripts/backup-db.sh`
2. Add to crontab for daily 3am backups: `0 3 * * * /path/to/backup-db.sh`
3. Optional: add `S3_BACKUP_BUCKET` to `.env` for offsite backups

### Cost

- **Free** if storing locally, ~$0.50/mo on S3

---

## 6. Stripe Webhook Security Fix (Critical)

### What

Add signature validation to the Stripe webhook endpoint.

### Why

- **Right now anyone can fake a payment.** The webhook at `routes/payments.js` processes incoming events without verifying they actually came from Stripe. Someone could POST a fake `checkout.session.completed` event and grant themselves premium for free
- This is the #1 security issue in the codebase

### What changes

- Add `stripe.webhooks.constructEvent()` call using `STRIPE_WEBHOOK_SECRET`
- Reject any webhook that doesn't have a valid Stripe signature

### Setup

1. Get webhook secret from Stripe Dashboard → Webhooks → Signing secret
2. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxx` (already in `.env.example`)
3. Code change in `routes/payments.js`

### Cost

- Free — just a code fix

---

## Priority Order

| #   | Task                   | Effort                | Impact                               |
| --- | ---------------------- | --------------------- | ------------------------------------ |
| 1   | **Redis**              | 5 min (add env var)   | Cache + rate limits survive restarts |
| 2   | **Stripe webhook fix** | 15 min (code change)  | Closes critical security hole        |
| 3   | **Sentry**             | 5 min (add env vars)  | Know when things break               |
| 4   | **Cloudflare Pages**   | 20 min (connect repo) | Faster frontend, less server load    |
| 5   | **S3 uploads**         | 30 min (code change)  | Photos survive redeploys             |
| 6   | **DB backups**         | 10 min (cron setup)   | Disaster recovery                    |

---

## What We're NOT Doing (and why)

| Thing                     | Why not                                            |
| ------------------------- | -------------------------------------------------- |
| Kubernetes                | Massive overkill for <10k users                    |
| Kafka / event streaming   | Designed for millions of events/sec, not our scale |
| Multiple API servers      | 1 server handles 1,000 users easily                |
| Load balancer             | Pointless with 1 server                            |
| PgBouncer / read replicas | Our connection pool of 20 handles this fine        |
| BullMQ job queue          | Nice to have later, not necessary yet              |
| Prometheus / Grafana      | Sentry covers our monitoring needs for now         |
