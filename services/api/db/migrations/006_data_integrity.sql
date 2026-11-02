-- Deletion work survives account removal and storage outages. No user FK: these
-- object keys must remain until the private media has actually been erased.
CREATE TABLE IF NOT EXISTS media_deletion_jobs (
  object_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS media_deletion_pending_idx ON media_deletion_jobs(next_attempt_at);

-- Purchases and generated deliverables are distinct activities.
CREATE TABLE IF NOT EXISTS generated_exports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS generated_exports_user_idx ON generated_exports(user_id, created_at);

-- Serialize and bound paid provider requests independently of the queue schema.
CREATE TABLE IF NOT EXISTS audiobook_generation_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audiobook_generation_requests_user_idx ON audiobook_generation_requests(user_id, created_at);
