-- New native-runtime state; intentionally separate from the audited source data schema.
CREATE TABLE story_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type = 'story-saved'),
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE (id, story_id)
) STRICT;
CREATE INDEX story_outbox_pending ON story_outbox(state, created_at);
