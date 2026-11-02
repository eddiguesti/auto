-- Durable cross-instance voice concurrency and signed webhook replay protection.
CREATE TABLE IF NOT EXISTS voice_connection_leases (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS telnyx_webhook_events (
  event_id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS telnyx_webhook_events_expiry_idx ON telnyx_webhook_events(expires_at);
