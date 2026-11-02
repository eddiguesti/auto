CREATE TABLE native_ops_audit (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject_id INTEGER,
  action TEXT NOT NULL,
  details TEXT NOT NULL CHECK(json_valid(details)),
  created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE native_admin_premium_grants (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  months INTEGER NOT NULL CHECK(months BETWEEN 1 AND 120),
  expires_at TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE native_support_escalations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  contact_name TEXT,
  message TEXT NOT NULL,
  conversation TEXT NOT NULL CHECK(json_valid(conversation)),
  state TEXT NOT NULL DEFAULT 'saved' CHECK(state IN ('saved','resolved')),
  created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE native_ops_daily_counters (
  day TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('analytics','csp')),
  event TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(day,category,event)
) STRICT;
CREATE INDEX native_support_owner ON native_support_escalations(user_id,id);

CREATE TABLE native_refund_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id INTEGER NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  refund_request_id INTEGER NOT NULL UNIQUE REFERENCES refund_requests(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  stripe_session_id TEXT NOT NULL,
  payment_intent_id TEXT,
  charge_id TEXT,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT NOT NULL,
  known_premium_until TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'created' CHECK(state IN ('created','lookup','effect_started','pending','succeeded','failed','needs_reconciliation')),
  provider_refund_id TEXT UNIQUE,
  lease_id TEXT,
  lease_expires INTEGER,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX native_refund_reconciliation ON native_refund_attempts(state,updated_at);

-- An external financial outcome must remain reconcilable even after its lease
-- expires. Erasure cannot cascade away a refund that might still settle.
CREATE TRIGGER prevent_account_delete_during_refund BEFORE DELETE ON users
WHEN EXISTS(SELECT 1 FROM native_refund_attempts WHERE user_id=OLD.id AND state IN ('lookup','effect_started','pending','needs_reconciliation'))
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;
CREATE TRIGGER prevent_payment_delete_during_refund BEFORE DELETE ON payments
WHEN EXISTS(SELECT 1 FROM native_refund_attempts WHERE payment_id=OLD.id AND state IN ('lookup','effect_started','pending','needs_reconciliation'))
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;
CREATE TRIGGER prevent_refund_request_delete_in_flight BEFORE DELETE ON refund_requests
WHEN EXISTS(SELECT 1 FROM native_refund_attempts WHERE refund_request_id=OLD.id AND state IN ('lookup','effect_started','pending','needs_reconciliation'))
BEGIN SELECT RAISE(ABORT,'EXTERNAL_ACCOUNT_WORK_PENDING'); END;
CREATE TRIGGER prevent_print_submission_during_refund BEFORE UPDATE OF status ON print_orders
WHEN NEW.status IN ('queued','submitting','submitted','dispatched','review') AND EXISTS(
  SELECT 1 FROM native_refund_attempts a JOIN print_entitlements e ON e.stripe_session_id=a.stripe_session_id
  WHERE e.id=NEW.entitlement_id AND a.state<>'failed')
BEGIN SELECT RAISE(ABORT,'REFUND_WORK_PENDING'); END;
