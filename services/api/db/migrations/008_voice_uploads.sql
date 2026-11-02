-- Owner-scoped source recordings are retained for playback and account export/deletion.
CREATE TABLE IF NOT EXISTS voice_uploads (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS voice_uploads_user_idx ON voice_uploads(user_id);
