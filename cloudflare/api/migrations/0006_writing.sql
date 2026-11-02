-- Per-story checkpoints fence paid style effects and retain originals until
-- the author deletes their account. Jobs never overwrite a newer source edit.
CREATE UNIQUE INDEX generation_one_active_style ON generation_jobs(owner_id)
  WHERE kind = 'style' AND state IN ('queued', 'active', 'effect_started');
CREATE TABLE writing_style_runs (
  job_id TEXT PRIMARY KEY NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initialized_at INTEGER NOT NULL
) STRICT;
CREATE TABLE writing_style_items (
  job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL,
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
  source_answer TEXT NOT NULL,
  source_original TEXT,
  source_updated_at TEXT,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'effect_started', 'completed', 'conflict', 'failed')),
  error_code TEXT,
  PRIMARY KEY (job_id, source_id)
) STRICT;
