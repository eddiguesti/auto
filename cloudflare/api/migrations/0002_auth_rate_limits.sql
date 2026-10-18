-- Staging runtime state, separate from the audited source-data contract.
CREATE TABLE auth_rate_limits (
  subject_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0)
) STRICT;
CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits(window_started_at);
