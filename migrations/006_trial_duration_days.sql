-- Migration 006: patch — trial_duration_days
-- Depends on: 001_core_identity.sql
--
-- Found while cross-referencing every `user.<field> =` assignment in
-- server.ts against the 001 schema: trial_duration_days is written
-- (POST /api/billing/trial/activate) but had no column. Adding it here
-- rather than editing 001 — migrations that have already been applied
-- anywhere (including this sandbox's test run) are never edited in place;
-- corrections are additive, so the migration history stays a truthful log
-- of what actually ran, in order, in every environment.

BEGIN;

ALTER TABLE users ADD COLUMN trial_duration_days SMALLINT;

COMMIT;
