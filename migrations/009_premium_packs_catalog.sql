-- Migration 009: premium packs catalog
-- Depends on: 002_billing.sql
--
-- Found via live testing: the premium_packs table (migration 002) had no
-- seed data, and neither did db.json or the frontend source — there was
-- no canonical pack catalog anywhere. The original /api/billing/packs/buy
-- route accepted a client-supplied packId and costInCredits with zero
-- server-side validation against any catalog, meaning a caller could
-- unlock an arbitrary "pack" for an arbitrary (including zero) credit
-- cost. The new FK constraint on user_premium_packs.pack_id closes that
-- gap by requiring the pack to actually exist server-side — this seed
-- data is what makes that enforcement meaningful rather than just
-- breaking the feature outright.

BEGIN;

ALTER TABLE premium_packs ADD COLUMN price_credits INTEGER NOT NULL DEFAULT 100 CHECK (price_credits > 0);

INSERT INTO premium_packs (id, name, price_cents, price_credits, active) VALUES
  ('pack_voice_clone',        'Voice Clone Calibration',      0, 150, true),
  ('pack_negotiation_coach',  'Negotiation Coach Pack',       0, 120, true),
  ('pack_sentiment_radar',    'Sentiment Radar Pro',          0, 100, true),
  ('pack_executive_tone',     'Executive Tone Pack',          0, 130, true);

-- price_cents is informational display data only; actual cost is charged
-- in Communication Credits (costInCredits) via the existing credit
-- ledger, matching how the route already worked — this table's job is
-- purely to make packId a validated, real catalog entry.

COMMIT;
