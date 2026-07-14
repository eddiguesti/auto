-- Exactly-once claim ledger for Stripe deliveries. The primary key prevents a
-- duplicate webhook from applying entitlements twice, while a rolled-back
-- transaction leaves the event retryable.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed
  ON stripe_webhook_events(processed_at DESC);
