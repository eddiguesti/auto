CREATE TABLE native_print_dispatch (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','active','effect_started','submitted','dispatched','review')),
  lease_token TEXT,
  lease_until INTEGER,
  post_started_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  error_code TEXT,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE native_print_outbox (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES native_print_dispatch(order_id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published')),
  claim_token TEXT,
  lease_until INTEGER
) STRICT;
CREATE TRIGGER prevent_account_delete_during_print BEFORE DELETE ON users
WHEN EXISTS(SELECT 1 FROM print_orders WHERE user_id=OLD.id AND status IN ('queued','submitting','submitted','review'))
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;

CREATE TABLE native_artwork_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','active','effect_started','provider_pending','completed','failed','review')),
  provider_request_id TEXT,
  lease_token TEXT,
  lease_until INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE UNIQUE INDEX native_artwork_one_active_chapter ON native_artwork_jobs(user_id,chapter_id)
  WHERE state IN ('queued','active','effect_started','provider_pending');
CREATE TABLE native_artwork_outbox (
  job_id TEXT PRIMARY KEY NOT NULL REFERENCES native_artwork_jobs(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published')),
  claim_token TEXT,
  lease_until INTEGER
) STRICT;
