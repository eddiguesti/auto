-- Snapshot the purchased terms: historical bundle payments retain their original offer.
CREATE TABLE IF NOT EXISTS print_entitlements (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE REFERENCES payments(stripe_session_id) ON DELETE CASCADE,
  package_version TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity = 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS print_orders (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_id UUID UNIQUE REFERENCES print_entitlements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proof' CHECK (status IN ('proof','queued','submitting','submitted','dispatched','review')),
  title TEXT NOT NULL,
  text_key TEXT NOT NULL,
  cover_key TEXT NOT NULL,
  page_count INTEGER NOT NULL CHECK (page_count BETWEEN 32 AND 200),
  colour_pages INTEGER NOT NULL CHECK (colour_pages BETWEEN 0 AND 8),
  product_sku TEXT NOT NULL,
  shipping_address JSONB,
  approved_at TIMESTAMPTZ,
  provider_id TEXT,
  provider_status TEXT,
  tracking_url TEXT,
  tracking_number TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS print_orders_user_idx ON print_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS print_orders_pending_idx ON print_orders(status, updated_at);
