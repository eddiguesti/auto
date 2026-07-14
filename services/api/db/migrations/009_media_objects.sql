-- Registry for private uploads that may not yet be attached to a memo or prompt.
-- This makes abandoned R2 objects discoverable and safely deletable.

CREATE TABLE IF NOT EXISTS media_objects (
  object_key TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  reference_type TEXT,
  reference_id INTEGER,
  referenced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_objects_user ON media_objects(user_id);
CREATE INDEX IF NOT EXISTS idx_media_objects_orphan
  ON media_objects(created_at)
  WHERE referenced_at IS NULL;
