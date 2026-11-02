-- Static definitions, not per-customer earned achievement rows.
CREATE TABLE game_achievement_definitions (
  achievement_key TEXT PRIMARY KEY NOT NULL,
  definition TEXT NOT NULL CHECK (json_valid(definition))
) STRICT;
-- One accepted completion owns every mutation in its D1 batch, preventing
-- concurrent duplicate answers/recording attachment without simulated locks.
CREATE TABLE game_completion_claims (
  kind TEXT NOT NULL CHECK (kind IN ('daily', 'family')),
  prompt_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (kind, prompt_id)
) STRICT;
CREATE TABLE game_shield_claims (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  PRIMARY KEY (user_id,date)
) STRICT;
ALTER TABLE story_outbox ADD COLUMN claim_token TEXT;
ALTER TABLE story_outbox ADD COLUMN lease_until INTEGER;
CREATE UNIQUE INDEX native_circle_one_owner ON memory_circles(owner_user_id);
CREATE UNIQUE INDEX native_circle_one_membership ON memory_circle_members(user_id);
