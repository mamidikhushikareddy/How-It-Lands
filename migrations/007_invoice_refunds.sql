-- Migration 007: invoice refund tracking
-- Depends on: 002_billing.sql
--
-- Found while migrating /api/admin/billing/refund: refunds can be partial,
-- and the original tracked refunded_amount + refund_reason as ad-hoc
-- fields bolted onto the invoice object. Adding them as real columns
-- rather than reusing amount_cents so the paid amount and refunded amount
-- are never conflated.

BEGIN;

ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'partially_refunded';

ALTER TABLE invoices
  ADD COLUMN refunded_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount_cents >= 0),
  ADD COLUMN refund_reason TEXT,
  ADD COLUMN refunded_at TIMESTAMPTZ,
  ADD CONSTRAINT chk_refund_not_exceed_amount CHECK (refunded_amount_cents <= amount_cents);

COMMIT;
