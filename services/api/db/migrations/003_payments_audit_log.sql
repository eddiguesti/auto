-- Immutable payment event history.
-- Append-only — never UPDATE or DELETE rows from this table.
-- Separate from the `payments` table which tracks mutable payment status.
-- Used for auditing, dispute resolution, and financial compliance.

CREATE TABLE IF NOT EXISTS payments_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  amount INTEGER,
  product_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_audit_log_user ON payments_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_audit_log_stripe_event ON payments_audit_log(stripe_event_id);
