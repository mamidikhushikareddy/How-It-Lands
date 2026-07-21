-- Migration 001: Core identity, sessions, RBAC, audit
-- Depends on: nothing (first migration)
--
-- Design notes (read before modifying):
-- 1. IDs stay TEXT to match the app's existing crypto.randomBytes-based ID
--    generation (avoids a churn-heavy rewrite of every ID call site right now).
--    Follow-up ticket: migrate to native UUID + gen_random_uuid() default.
-- 2. Enums are real Postgres ENUM types, not free-text VARCHAR, so a bad
--    'plan' or 'role' value is rejected by the database, not just the app.
--    App-layer validation is still required — this is defense in depth,
--    not a replacement for it.
-- 3. Every table gets created_at; mutable tables get updated_at maintained
--    by trigger (never trust app code to remember to set it).
-- 4. RLS is intentionally NOT enabled in this migration. The previous
--    implementation enabled RLS relying on `current_setting('app.current_user_id')`
--    but never issued `SET LOCAL` inside a transaction per request, and the
--    app used a connection pool — meaning the setting was either unset
--    (RLS policies silently no-op to "no rows") or leaked across pooled
--    connections serving different users. That's worse than no RLS: it
--    creates false confidence. Authorization will be enforced explicitly in
--    the application query layer (every query scoped by user_id, covered by
--    tests). RLS can be added back later as defense-in-depth once the app
--    correctly wraps each request in a transaction with SET LOCAL — tracked
--    as follow-up, not done here.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TYPE user_plan AS ENUM ('free', 'plus', 'pro', 'teams', 'enterprise');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin', 'moderator', 'editor', 'guest');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');

CREATE TABLE users (
  id                      TEXT PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  email                   CITEXT NOT NULL UNIQUE, -- case-insensitive email, prevents Foo@x.com / foo@x.com duplicate accounts
  password_hash           TEXT,                   -- NULL for OAuth-only accounts
  password_salt           TEXT,
  plan                    user_plan NOT NULL DEFAULT 'free',
  role                    user_role NOT NULL DEFAULT 'user',
  status                  user_status NOT NULL DEFAULT 'active',
  onboarding_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count_month       INTEGER NOT NULL DEFAULT 0 CHECK (usage_count_month >= 0),
  usage_period_reset_at   TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  billing_customer_id     TEXT,                   -- Stripe customer ID (cus_...)
  billing_status          TEXT,                   -- mirrors Stripe subscription status
  billing_cycle           billing_cycle,
  billing_paused          BOOLEAN NOT NULL DEFAULT FALSE,
  billing_canceled        BOOLEAN NOT NULL DEFAULT FALSE,
  trial_active            BOOLEAN NOT NULL DEFAULT FALSE,
  trial_expires_at        TIMESTAMPTZ,
  credit_balance          INTEGER NOT NULL DEFAULT 0 CHECK (credit_balance >= 0), -- integer credits, not currency
  two_factor_secret       TEXT,
  two_factor_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts   SMALLINT NOT NULL DEFAULT 0,
  locked_until             TIMESTAMPTZ,
  oauth_provider          TEXT,
  oauth_id                TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,             -- soft delete: preserves FK integrity for invoices/audit history

  CONSTRAINT chk_password_or_oauth CHECK (
    (password_hash IS NOT NULL AND password_salt IS NOT NULL) OR oauth_provider IS NOT NULL
  ),
  CONSTRAINT uq_oauth_identity UNIQUE (oauth_provider, oauth_id)
);

CREATE INDEX idx_users_billing_customer_id ON users (billing_customer_id) WHERE billing_customer_id IS NOT NULL;
CREATE INDEX idx_users_status ON users (status) WHERE status != 'active';
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Password history: prevents immediate password reuse. Was an array column
-- on the user in the old schema (recent_passwords TEXT[]) — normalized so
-- it can be queried/pruned and doesn't grow the users row unbounded.
CREATE TABLE password_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_history_user_id ON password_history (user_id, created_at DESC);

CREATE TABLE user_profiles (
  user_id                        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  communication_style            VARCHAR(100),
  overdo_patterns                TEXT[] NOT NULL DEFAULT '{}',
  preferred_tone                 VARCHAR(100),
  preserve_voice                 BOOLEAN NOT NULL DEFAULT TRUE,
  favorite_phrases               TEXT[] NOT NULL DEFAULT '{}',
  avoided_phrases                TEXT[] NOT NULL DEFAULT '{}',
  default_scenario               VARCHAR(100),
  notes                          TEXT,
  timezone                       VARCHAR(64) NOT NULL DEFAULT 'UTC',
  locale                         VARCHAR(16) NOT NULL DEFAULT 'en-US',
  email_notifications_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  security_alerts_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_reports_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  ui_density                     VARCHAR(16) NOT NULL DEFAULT 'comfortable' CHECK (ui_density IN ('comfortable', 'compact')),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sessions: hashed token, not raw. If this table ever leaks (backup dump,
-- read-replica misconfig, etc.) the stored value cannot be replayed as a
-- session cookie. The app looks up by hash of the cookie value, same
-- pattern as password reset tokens.
CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash       TEXT NOT NULL UNIQUE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent       TEXT,
  ip_address       INET,
  expires_at       TIMESTAMPTZ NOT NULL,
  revoked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at); -- for the cleanup job (see 004)

CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

CREATE TABLE email_verification_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);

-- RBAC: kept data-driven (admin-editable) rather than hardcoded in app code,
-- matching the product's existing admin permission-configuration intent.
CREATE TABLE role_permissions (
  role        user_role PRIMARY KEY,
  permissions TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO role_permissions (role, permissions) VALUES
  ('super_admin', ARRAY['system:all','users:manage','content:manage','content:moderate','content:create_edit','dashboard:access','profile:manage']),
  ('admin',       ARRAY['users:manage','content:manage','content:moderate','content:create_edit','dashboard:access','profile:manage']),
  ('moderator',   ARRAY['content:moderate','dashboard:access','profile:manage']),
  ('editor',      ARRAY['content:create_edit','dashboard:access','profile:manage']),
  ('user',        ARRAY['dashboard:access','profile:manage']),
  ('guest',       ARRAY[]::TEXT[]);

-- Audit log: append-only, no cap (the old implementation truncated to the
-- last 500 rows in a JSON file — that's not an audit log, that's a rolling
-- buffer that silently destroys evidence). Retention/archival policy is an
-- operational decision (e.g. partition by month, archive to cold storage
-- after N days) — not a hard row-count cap in application code.
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address  INET,
  event       VARCHAR(100) NOT NULL,
  details     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event ON audit_logs (event, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

COMMIT;
