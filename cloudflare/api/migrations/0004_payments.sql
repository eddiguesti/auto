CREATE TABLE native_checkouts (
  stripe_session_id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'completed')),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  processing_token TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('processing', 'completed')),
  created_at TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX native_refund_pending_payment ON refund_requests(user_id, payment_id) WHERE status = 'pending';
