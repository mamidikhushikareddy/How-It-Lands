-- Migration 002: Billing
-- Depends on: 001_core_identity.sql
--
-- Design notes:
-- 1. All money is stored as INTEGER cents (amount_cents), never
--    floating point / NUMERIC dollars. The old schema stored
--    `monthlyPrice: 12` as a JS number — fine for a demo, a real incident
--    waiting to happen for anything doing arithmetic (proration, refunds,
--    coupon math) on floats. Stripe itself uses integer cents; matching
--    that avoids a conversion bug at the integration boundary.
-- 2. invoices and credit_transactions were arrays nested inside the user
--    object (User.invoices, User.credit_history). That makes them
--    impossible to index, impossible to constrain, and every update
--    required rewriting the entire user blob (part of the concurrency/
--    lost-write problem in the old JSON-file design). They're now
--    first-class tables with foreign keys.
-- 3. credit_transactions is treated as an append-only ledger — balance is
--    derived by summing it (or maintained via trigger below), never
--    mutated directly. This is the standard pattern for anything
--    resembling money: you can always reconstruct "how did we get here."
-- 4. processed_webhook_events enforces idempotency at the database level
--    (UNIQUE constraint) instead of an application-level array membership
--    check, which is not safe under concurrent webhook delivery (Stripe
--    *will* retry and *will* deliver out of order or twice).

BEGIN;

CREATE TYPE invoice_status AS ENUM ('paid', 'pending', 'failed', 'refunded');

-- Plans: admin-configurable, so this stays a table (matches the existing
-- admin billing/plans/configure endpoint) rather than a hardcoded const.
CREATE TABLE plans (
  id                    TEXT PRIMARY KEY, -- 'free' | 'plus' | 'pro' | 'teams' | 'enterprise'
  name                  VARCHAR(100) NOT NULL,
  tagline               VARCHAR(255),
  description           TEXT,
  monthly_price_cents   INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  annual_price_cents    INTEGER NOT NULL CHECK (annual_price_cents >= 0),
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  stripe_monthly_price_id TEXT, -- Stripe Price object ID, set once Stripe is wired up
  stripe_annual_price_id  TEXT,
  analysis_per_month    INTEGER NOT NULL DEFAULT 0, -- -1 = unlimited
  saved_history_limit   INTEGER NOT NULL DEFAULT 0,
  custom_templates_limit INTEGER NOT NULL DEFAULT 0,
  custom_playbooks_limit INTEGER NOT NULL DEFAULT 0,
  features             JSONB NOT NULL DEFAULT '[]', -- display copy only, never used for entitlement checks
  is_popular            BOOLEAN NOT NULL DEFAULT FALSE,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            SMALLINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO plans (id, name, tagline, description, monthly_price_cents, annual_price_cents, analysis_per_month, saved_history_limit, custom_templates_limit, custom_playbooks_limit, is_popular, sort_order) VALUES
  ('free',       'Free Starter',      'Evaluate core communication signals.',           'Perfect for professionals evaluating core communication landing diagnostics.', 0,     0,      5,   10, 2,   0,   FALSE, 0),
  ('plus',       'Plus Professional', 'Deepen emotional control & rewrite logic.',      'Designed for professionals, managers, and frequent individual communicators.', 1200,  9600,   50,  -1, 15,  5,   TRUE,  1),
  ('pro',        'Pro Sovereign',     'Full personalized AI communication coaching.',   'For power users, consultants, founders, and content creators.',               2900,  23200,  500, -1, 100, 50,  FALSE, 2),
  ('teams',      'Teams Hub',         'Synchronize high-standards across your org.',    'Collaborative solution for growing teams and departments.',                   1500,  12000,  2500,-1, -1,  -1,  FALSE, 3),
  ('enterprise', 'Enterprise Secure', 'SSO, compliance-ready controls, dedicated support.', 'Robust alignment, security, and elite support for multi-department enterprises.', 9900, 95000, -1, -1, -1, -1, FALSE, 4);

CREATE TABLE coupons (
  code                  TEXT PRIMARY KEY,
  discount_type         VARCHAR(16) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value        INTEGER NOT NULL CHECK (discount_value >= 0), -- percentage points OR cents, per discount_type
  expires_at            TIMESTAMPTZ NOT NULL,
  usage_limit           INTEGER NOT NULL CHECK (usage_limit > 0),
  times_used            INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  single_use_per_user    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_usage_within_limit CHECK (times_used <= usage_limit)
);

-- Which users have claimed which coupon — replaces the claimedByUsers TEXT[]
-- array on the coupon row, which had no way to prevent a race between two
-- concurrent redemptions from the same user both passing a "have I already
-- used this" array-contains check. A UNIQUE constraint makes double-claim
-- impossible at the database level regardless of application race conditions.
CREATE TABLE coupon_redemptions (
  coupon_code   TEXT NOT NULL REFERENCES coupons(code) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coupon_code, user_id)
);

CREATE TABLE invoices (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- RESTRICT: never allow deleting a user out from under financial records
  invoice_number  TEXT NOT NULL UNIQUE,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  status          invoice_status NOT NULL DEFAULT 'pending',
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  billing_cycle   billing_cycle NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  pdf_url         TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoices_user_id ON invoices (user_id, created_at DESC);
CREATE INDEX idx_invoices_status ON invoices (status);

-- Append-only credit ledger. Positive = granted (purchase/gift/refund),
-- negative = consumed. Never UPDATE a row's amount after insert; issue a
-- new offsetting row (e.g. a refund is a new positive row referencing the
-- original, not a mutation of it) so the ledger stays a true audit trail.
CREATE TABLE credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL CHECK (amount != 0),
  description   TEXT NOT NULL,
  reference_id  TEXT, -- e.g. the invoice or original transaction this offsets
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions (user_id, created_at DESC);

-- Keep users.credit_balance as a maintained cache (fast reads on every
-- analyze request) but make the ledger authoritative: a trigger keeps them
-- in sync so the cache can never silently drift, and the balance can be
-- reconciled by re-summing the ledger at any time.
CREATE OR REPLACE FUNCTION apply_credit_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET credit_balance = credit_balance + NEW.amount WHERE id = NEW.user_id;
  IF (SELECT credit_balance FROM users WHERE id = NEW.user_id) < 0 THEN
    RAISE EXCEPTION 'Credit transaction % would drive user % balance negative', NEW.id, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credit_transactions_apply AFTER INSERT ON credit_transactions
  FOR EACH ROW EXECUTE FUNCTION apply_credit_transaction();

CREATE TABLE premium_packs (
  id          TEXT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE user_premium_packs (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id     TEXT NOT NULL REFERENCES premium_packs(id) ON DELETE RESTRICT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

-- Idempotency for inbound payment-gateway webhooks. UNIQUE constraint does
-- the enforcement — a concurrent duplicate delivery will fail the INSERT
-- with a constraint violation rather than racing on an in-memory/JSON
-- array `.includes()` check (which is not atomic).
CREATE TABLE processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload      JSONB NOT NULL
);

COMMIT;
