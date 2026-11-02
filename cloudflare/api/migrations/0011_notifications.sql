CREATE TABLE native_notification_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  occurrence_key TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  telegram_user_id INTEGER REFERENCES telegram_users(id) ON DELETE CASCADE,
  subscriber_id INTEGER REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  queue_id INTEGER REFERENCES notification_queue(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('email','telegram')),
  preference_key TEXT,
  authorization_revision INTEGER,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','effect_started','sent','failed','cancelled','review')),
  lease_id TEXT,
  lease_expires INTEGER,
  first_send_at INTEGER,
  next_attempt_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX native_notification_due ON native_notification_jobs(state,next_attempt_at);
CREATE INDEX native_notification_owner ON native_notification_jobs(user_id);
CREATE TABLE native_notification_cursor (
  id TEXT PRIMARY KEY NOT NULL,
  last_user_id INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE TABLE native_telegram_state (
  telegram_user_id INTEGER PRIMARY KEY REFERENCES telegram_users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0,
  link_claim TEXT,
  lease_id TEXT,
  lease_expires INTEGER,
  last_update_id INTEGER NOT NULL DEFAULT -1,
  delivery_blocked INTEGER NOT NULL DEFAULT 0 CHECK(delivery_blocked IN (0,1))
) STRICT;
CREATE TABLE native_telegram_inbox (
  update_id INTEGER PRIMARY KEY NOT NULL,
  telegram_user_id INTEGER NOT NULL REFERENCES telegram_users(id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  authorization_revision INTEGER NOT NULL,
  payload_hash TEXT NOT NULL,
  message_id TEXT NOT NULL,
  text TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','completed','cancelled','failed')),
  lease_id TEXT,
  lease_expires INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX native_telegram_pending ON native_telegram_inbox(state,update_id);
CREATE TABLE native_newsletter_tokens (
  token_hash TEXT PRIMARY KEY NOT NULL,
  subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('confirm','unsubscribe')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX native_newsletter_tokens_owner ON native_newsletter_tokens(subscriber_id,purpose);
CREATE TABLE native_newsletter_consent (
  subscriber_id INTEGER PRIMARY KEY REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  confirmed_at INTEGER,
  last_confirmation_at INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE TRIGGER prevent_account_delete_during_notification BEFORE DELETE ON users
WHEN EXISTS(SELECT 1 FROM native_notification_jobs WHERE user_id=OLD.id AND state='effect_started' AND lease_expires>unixepoch()*1000)
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;

CREATE TRIGGER prevent_telegram_delete_during_notification BEFORE DELETE ON telegram_users
WHEN EXISTS(SELECT 1 FROM native_notification_jobs WHERE telegram_user_id=OLD.id AND state='effect_started' AND lease_expires>unixepoch()*1000)
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;
CREATE TRIGGER prevent_newsletter_delete_during_notification BEFORE DELETE ON newsletter_subscribers
WHEN EXISTS(SELECT 1 FROM native_notification_jobs WHERE subscriber_id=OLD.id AND state='effect_started' AND lease_expires>unixepoch()*1000)
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;
