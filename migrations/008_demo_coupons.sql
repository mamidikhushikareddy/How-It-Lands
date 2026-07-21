-- Migration 008: demo coupons for the admin test-suite diagnostic tool
-- Depends on: 002_billing.sql
--
-- server/testBilling.ts (POST /api/billing/admin/test-suite/run) exercises
-- the coupon engine against known fixture codes. These existed only in the
-- original db.json seed data; recreating them here so the diagnostic tool
-- keeps working against the real database.

BEGIN;

INSERT INTO coupons (code, discount_type, discount_value, expires_at, usage_limit, times_used, single_use_per_user) VALUES
  ('SAVE20', 'percentage', 20, NOW() + INTERVAL '1 year', 1000, 0, false),
  ('EXPIRED_CODE', 'percentage', 15, NOW() - INTERVAL '30 days', 100, 0, false),
  ('LIMIT_REACHED', 'fixed', 500, NOW() + INTERVAL '1 year', 10, 10, false);

COMMIT;
