-- Migration 005: Promo codes
-- Depends on: 001_core_identity.sql
--
-- Found while building the data-access layer: /api/billing/promotions/apply
-- had five bonus-credit codes (LAUNCH50, STUDENT30, REFERRAL20, SPRING77,
-- SOVEREIGNVIP) hardcoded as an if/else chain in the route handler, with
-- "already applied" tracked via an array-contains check on the user row.
-- That means changing a promo's value requires a code deploy, and the
-- same double-redemption race as coupons applied here. Distinct from
-- `coupons` (checkout-time discounts) because these grant credits
-- directly and aren't tied to a purchase — kept as a separate table
-- rather than overloading the coupons model with a mismatched shape.

BEGIN;

CREATE TABLE promo_codes (
  code            TEXT PRIMARY KEY,
  bonus_credits   INTEGER NOT NULL CHECK (bonus_credits > 0),
  description     TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promo_code_redemptions (
  promo_code   TEXT NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promo_code, user_id) -- database-level guarantee against double redemption
);

INSERT INTO promo_codes (code, bonus_credits, description) VALUES
  ('LAUNCH50',     50,  'Launch Promotion — 50 free Communication Credits'),
  ('STUDENT30',    30,  'Student Discount — 30 free Communication Credits'),
  ('REFERRAL20',   20,  'Referral invitation reward — 20 free Communication Credits'),
  ('SPRING77',     100, 'Seasonal Spring Festival promotion — 100 free Communication Credits'),
  ('SOVEREIGNVIP', 500, 'VIP Partner code — 500 premium Communication Credits');

COMMIT;
