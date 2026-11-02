-- A committed transcript survives provider, queue and isolate failures.
CREATE TABLE voice_compilation_jobs (
  session_id INTEGER PRIMARY KEY REFERENCES voice_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','completed','failed')),
  provider_started INTEGER NOT NULL DEFAULT 0 CHECK(provider_started IN (0,1)),
  lease_id TEXT,
  lease_expires INTEGER,
  not_before INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX voice_compilation_pending ON voice_compilation_jobs(state,not_before);
