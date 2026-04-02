-- Add soft-delete support to the users table.
-- Soft-deleted accounts are retained for 30 days (GDPR compliance window)
-- before a cron job hard-deletes them.
--
-- NEVER hard delete a user record without first checking deleted_at is set.
-- See services/api/repositories/userRepository.js for query exclusion logic.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
