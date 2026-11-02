-- A scoped email credential can address only its own prompt-bound interview.
CREATE TABLE magic_voice_sessions (
  token_id INTEGER PRIMARY KEY REFERENCES email_session_tokens(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_session_id INTEGER NOT NULL UNIQUE REFERENCES voice_sessions(id) ON DELETE CASCADE
) STRICT;
