-- Runtime-neutral background job state. Cloudflare Queues do not expose a
-- queryable job record, so application-visible status lives in PostgreSQL.

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY,
  job_name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'created'
    CHECK (state IN ('created', 'active', 'completed', 'failed')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_user_created
  ON background_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_background_jobs_state_updated
  ON background_jobs(state, updated_at);
