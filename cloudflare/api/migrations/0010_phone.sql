CREATE TABLE phone_interviews (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_key TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  authentication TEXT CHECK(authentication IS NULL OR json_valid(authentication)),
  prompt_text TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  voice_session_id INTEGER REFERENCES voice_sessions(id) ON DELETE SET NULL,
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
  source_answer TEXT,
  initial_answer TEXT,
  source_version TEXT,
  state TEXT NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','dial_started','dialed','answered','streaming','ending','completed','failed','needs_reconciliation','cancelled')),
  call_control_id TEXT UNIQUE,
  stream_id TEXT,
  stream_nonce_hash TEXT NOT NULL UNIQUE,
  stream_expires INTEGER NOT NULL,
  stream_consumed INTEGER NOT NULL DEFAULT 0 CHECK(stream_consumed IN (0,1)),
  lease_id TEXT NOT NULL,
  deadline INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  answered_at INTEGER,
  ended_at INTEGER,
  transcript_bytes INTEGER NOT NULL DEFAULT 0,
  transcript_conflict INTEGER NOT NULL DEFAULT 0 CHECK(transcript_conflict IN (0,1)),
  finalized INTEGER NOT NULL DEFAULT 0 CHECK(finalized IN (0,1)),
  error_code TEXT,
  UNIQUE(user_id,request_key)
) STRICT;
CREATE INDEX phone_interview_history ON phone_interviews(user_id,created_at);
CREATE UNIQUE INDEX phone_one_active_call ON phone_interviews(user_id)
  WHERE state IN ('reserved','dial_started','dialed','answered','streaming','ending');
ALTER TABLE voice_sessions ADD COLUMN phone_request_id TEXT REFERENCES phone_interviews(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX native_voice_phone_request ON voice_sessions(phone_request_id);
ALTER TABLE telnyx_calls ADD COLUMN phone_request_id TEXT REFERENCES phone_interviews(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX native_telnyx_phone_request ON telnyx_calls(phone_request_id);
CREATE UNIQUE INDEX native_telnyx_control_id ON telnyx_calls(call_control_id);

CREATE TABLE phone_transcript_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES phone_interviews(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  mutation_token TEXT NOT NULL UNIQUE,
  transcript TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(request_id,event_id)
) STRICT;

-- Minimal provider controls survive account erasure until hangup is confirmed.
-- No phone number, memoir text or authentication credential belongs here.
CREATE TABLE phone_commands (
  id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT REFERENCES phone_interviews(id) ON DELETE SET NULL,
  call_control_id TEXT NOT NULL,
  command TEXT NOT NULL CHECK(command = 'hangup'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','completed')),
  lease_id TEXT,
  lease_expires INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  UNIQUE(call_control_id,command)
) STRICT;
CREATE INDEX phone_commands_pending ON phone_commands(state,lease_expires);

CREATE TABLE phone_outreach (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurrence_key TEXT NOT NULL,
  prompt TEXT NOT NULL CHECK(json_valid(prompt)),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','completed','cancelled','needs_reconciliation')),
  lease_id TEXT,
  lease_expires INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  call_request_id TEXT REFERENCES phone_interviews(id) ON DELETE SET NULL,
  UNIQUE(user_id,occurrence_key)
) STRICT;
CREATE INDEX phone_outreach_pending ON phone_outreach(state,created_at);
