-- Native queue authority. Queue bodies contain only version/jobId; D1 owns all
-- authorization, payload, status and irreversible-provider-effect decisions.
CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('audiobook', 'epub', 'style')),
  request_key TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'active', 'effect_started', 'completed', 'failed', 'needs_reconciliation', 'cancelled')),
  object_key TEXT UNIQUE,
  input_hash TEXT,
  lease_token TEXT,
  lease_until INTEGER,
  safe_cleanup_after INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  accounted_at INTEGER,
  UNIQUE (owner_id, kind, request_key)
) STRICT;
CREATE UNIQUE INDEX generation_one_active_audiobook ON generation_jobs(owner_id)
  WHERE kind = 'audiobook' AND state IN ('queued', 'active', 'effect_started');
CREATE INDEX generation_owner_history ON generation_jobs(owner_id, kind, created_at);
CREATE INDEX generation_cleanup_fence ON generation_jobs(object_key, safe_cleanup_after);

CREATE TABLE generation_outbox (
  job_id TEXT PRIMARY KEY NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'published')),
  claim_token TEXT,
  lease_until INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER
) STRICT;
CREATE INDEX generation_outbox_pending ON generation_outbox(state, lease_until);
