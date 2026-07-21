/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PoolClient } from 'pg';
import { pool } from '../pool';
import { withTransaction } from '../transaction';

const client = (c?: PoolClient) => c ?? pool;

// --- Plans ---

export interface PlanRow {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number;
  currency: string;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  analysis_per_month: number;
  saved_history_limit: number;
  custom_templates_limit: number;
  custom_playbooks_limit: number;
  features: string[];
  is_popular: boolean;
  active: boolean;
  sort_order: number;
}

export async function listActivePlans(c?: PoolClient): Promise<PlanRow[]> {
  const { rows } = await client(c).query<PlanRow>(
    `SELECT * FROM plans WHERE active = TRUE ORDER BY sort_order ASC`
  );
  return rows;
}

export async function getPlan(id: string, c?: PoolClient): Promise<PlanRow | null> {
  const { rows } = await client(c).query<PlanRow>(`SELECT * FROM plans WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// --- Coupons ---

export interface CouponRow {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expires_at: Date;
  usage_limit: number;
  times_used: number;
  single_use_per_user: boolean;
}

export async function findCoupon(code: string, c?: PoolClient): Promise<CouponRow | null> {
  const { rows } = await client(c).query<CouponRow>(
    `SELECT * FROM coupons WHERE code = $1`,
    [code.trim().toUpperCase()]
  );
  return rows[0] ?? null;
}

export async function hasUserRedeemedCoupon(code: string, userId: string, c?: PoolClient): Promise<boolean> {
  const { rows } = await client(c).query(
    `SELECT 1 FROM coupon_redemptions WHERE coupon_code = $1 AND user_id = $2`,
    [code.trim().toUpperCase(), userId]
  );
  return rows.length > 0;
}

/**
 * Atomically checks validity (not expired, under usage limit, not already
 * redeemed by this user if single-use-per-user) and records the
 * redemption, all inside one transaction with a row lock on the coupon.
 * Returns null if the coupon is invalid/exhausted/already used — caller
 * decides the exact user-facing message.
 *
 * The `FOR UPDATE` lock is what actually prevents two concurrent requests
 * both reading times_used=99/usage_limit=100 and both succeeding — without
 * it, this has the exact race the old array-based implementation had.
 */
export async function redeemCoupon(code: string, userId: string): Promise<{ ok: true; coupon: CouponRow } | { ok: false; reason: 'not_found' | 'expired' | 'exhausted' | 'already_used' }> {
  const upperCode = code.trim().toUpperCase();
  return withTransaction(async (tx) => {
    const { rows } = await tx.query<CouponRow>(
      `SELECT * FROM coupons WHERE code = $1 FOR UPDATE`,
      [upperCode]
    );
    const coupon = rows[0];
    if (!coupon) return { ok: false, reason: 'not_found' as const };
    if (new Date(coupon.expires_at) < new Date()) return { ok: false, reason: 'expired' as const };
    if (coupon.times_used >= coupon.usage_limit) return { ok: false, reason: 'exhausted' as const };

    if (coupon.single_use_per_user) {
      const already = await tx.query(
        `SELECT 1 FROM coupon_redemptions WHERE coupon_code = $1 AND user_id = $2`,
        [upperCode, userId]
      );
      if (already.rows.length > 0) return { ok: false, reason: 'already_used' as const };
    }

    await tx.query(`UPDATE coupons SET times_used = times_used + 1 WHERE code = $1`, [upperCode]);
    // Unique constraint on (coupon_code, user_id) is the real backstop even
    // if the single_use_per_user check above raced — but it won't, we hold
    // the row lock for the duration of this transaction.
    await tx.query(
      `INSERT INTO coupon_redemptions (coupon_code, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [upperCode, userId]
    );

    return { ok: true, coupon };
  });
}

// --- Promo codes (bonus-credit grants, distinct from checkout coupons) ---

export interface PromoCodeRow {
  code: string;
  bonus_credits: number;
  description: string;
  active: boolean;
  expires_at: Date | null;
}

export async function redeemPromoCode(code: string, userId: string): Promise<
  | { ok: true; promo: PromoCodeRow }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'already_used' }
> {
  const upperCode = code.trim().toUpperCase();
  return withTransaction(async (tx) => {
    const { rows } = await tx.query<PromoCodeRow>(
      `SELECT * FROM promo_codes WHERE code = $1 FOR UPDATE`,
      [upperCode]
    );
    const promo = rows[0];
    if (!promo) return { ok: false, reason: 'not_found' as const };
    if (!promo.active) return { ok: false, reason: 'inactive' as const };
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { ok: false, reason: 'expired' as const };

    const already = await tx.query(
      `SELECT 1 FROM promo_code_redemptions WHERE promo_code = $1 AND user_id = $2`,
      [upperCode, userId]
    );
    if (already.rows.length > 0) return { ok: false, reason: 'already_used' as const };

    await tx.query(
      `INSERT INTO promo_code_redemptions (promo_code, user_id) VALUES ($1, $2)`,
      [upperCode, userId]
    );
    await tx.query(
      `INSERT INTO credit_transactions (user_id, amount, description, reference_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, promo.bonus_credits, `Promotional credit bonus: ${upperCode}`, upperCode]
    );

    return { ok: true, promo };
  });
}

// --- Credit ledger ---

/**
 * Grants credits (positive amount). The `apply_credit_transaction` trigger
 * (migration 002) updates users.credit_balance atomically as part of this
 * same INSERT — no separate "now update the cached balance" step to
 * forget or race.
 */
export async function grantCredits(userId: string, amount: number, description: string, referenceId?: string, c?: PoolClient): Promise<void> {
  if (amount <= 0) throw new Error('grantCredits requires a positive amount; use consumeCredits to deduct.');
  await client(c).query(
    `INSERT INTO credit_transactions (user_id, amount, description, reference_id) VALUES ($1, $2, $3, $4)`,
    [userId, amount, description, referenceId ?? null]
  );
}

/**
 * Consumes credits (inserts a negative ledger row). The trigger raises an
 * exception (caught here as InsufficientCreditsError) if this would drive
 * the balance negative — this is enforced by the database, so it holds
 * even under concurrent consumption from the same account across multiple
 * devices/tabs, which a pre-check in application code would not guarantee.
 */
export class InsufficientCreditsError extends Error {}

export async function consumeCredits(userId: string, amount: number, description: string, c?: PoolClient): Promise<void> {
  if (amount <= 0) throw new Error('consumeCredits requires a positive amount.');
  try {
    await client(c).query(
      `INSERT INTO credit_transactions (user_id, amount, description) VALUES ($1, $2, $3)`,
      [userId, -amount, description]
    );
  } catch (err: any) {
    if (err.message?.includes('would drive user') || err.code === '23514') {
      throw new InsufficientCreditsError(`Insufficient credit balance for user ${userId}`);
    }
    throw err;
  }
}

export async function getCreditHistory(userId: string, limit: number, offset: number, c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

// --- Invoices ---

export interface CreateInvoiceInput {
  id: string;
  userId: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  planId: string;
  billingCycle: 'monthly' | 'annual';
  stripeInvoiceId?: string | null;
}

export async function createInvoice(input: CreateInvoiceInput, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO invoices (id, user_id, invoice_number, amount_cents, currency, status, plan_id, billing_cycle, stripe_invoice_id, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6::invoice_status, $7, $8, $9, CASE WHEN $6::text = 'paid' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [input.id, input.userId, input.invoiceNumber, input.amountCents, input.currency, input.status, input.planId, input.billingCycle, input.stripeInvoiceId ?? null]
  );
  return rows[0];
}

export async function listInvoicesForUser(userId: string, c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getInvoice(id: string, c?: PoolClient) {
  const { rows } = await client(c).query(`SELECT * FROM invoices WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// --- Webhook idempotency ---

/**
 * Returns true if this is the first time we've seen this event_id (and
 * records it). The UNIQUE constraint on processed_webhook_events.event_id
 * is what actually enforces this under concurrent delivery — ON CONFLICT
 * DO NOTHING + checking rowCount is the standard safe pattern for
 * "insert if not exists, tell me which happened" without a race between a
 * SELECT and an INSERT.
 */
export async function markWebhookProcessed(eventId: string, eventType: string, payload: unknown, c?: PoolClient): Promise<boolean> {
  const { rowCount } = await client(c).query(
    `INSERT INTO processed_webhook_events (event_id, event_type, payload)
     VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING`,
    [eventId, eventType, JSON.stringify(payload)]
  );
  return (rowCount ?? 0) > 0;
}

// --- Premium packs ---

export async function purchasePremiumPack(userId: string, packId: string): Promise<
  { ok: true } | { ok: false; reason: 'already_owned' | 'insufficient_credits' | 'pack_not_found' }
> {
  return withTransaction(async (tx) => {
    const packResult = await tx.query(`SELECT price_credits FROM premium_packs WHERE id = $1 AND active = TRUE`, [packId]);
    if (packResult.rows.length === 0) return { ok: false, reason: 'pack_not_found' as const };
    const priceCredits = packResult.rows[0].price_credits;

    const owned = await tx.query(
      `SELECT 1 FROM user_premium_packs WHERE user_id = $1 AND pack_id = $2`,
      [userId, packId]
    );
    if (owned.rows.length > 0) return { ok: false, reason: 'already_owned' as const };

    try {
      await tx.query(
        `INSERT INTO credit_transactions (user_id, amount, description, reference_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, -priceCredits, `Premium pack purchase: ${packId}`, packId]
      );
    } catch (err: any) {
      if (err.code === '23514') return { ok: false, reason: 'insufficient_credits' as const };
      throw err;
    }

    await tx.query(
      `INSERT INTO user_premium_packs (user_id, pack_id) VALUES ($1, $2)`,
      [userId, packId]
    );
    return { ok: true };
  });
}

// --- Admin plan configuration ---

export async function updatePlan(
  id: string,
  fields: { monthlyPriceCents?: number; annualPriceCents?: number; tagline?: string },
  c?: PoolClient
): Promise<PlanRow | null> {
  const { rows } = await client(c).query<PlanRow>(
    `UPDATE plans SET
       monthly_price_cents = COALESCE($2, monthly_price_cents),
       annual_price_cents = COALESCE($3, annual_price_cents),
       tagline = COALESCE($4, tagline)
     WHERE id = $1 RETURNING *`,
    [id, fields.monthlyPriceCents ?? null, fields.annualPriceCents ?? null, fields.tagline ?? null]
  );
  return rows[0] ?? null;
}

// --- Refunds ---

export async function refundInvoice(
  invoiceId: string,
  amountCents: number,
  reason: string
): Promise<{ ok: true; invoice: any } | { ok: false; reason: 'not_found' | 'exceeds_refundable' }> {
  return withTransaction(async (tx) => {
    const { rows } = await tx.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [invoiceId]);
    const invoice = rows[0];
    if (!invoice) return { ok: false, reason: 'not_found' as const };

    const maxRefundable = invoice.amount_cents - invoice.refunded_amount_cents;
    if (amountCents > maxRefundable) return { ok: false, reason: 'exceeds_refundable' as const };

    const newRefundedTotal = invoice.refunded_amount_cents + amountCents;
    const newStatus = newRefundedTotal >= invoice.amount_cents ? 'refunded' : 'partially_refunded';

    const { rows: updated } = await tx.query(
      `UPDATE invoices SET refunded_amount_cents = $2, refund_reason = $3, refunded_at = NOW(), status = $4
       WHERE id = $1 RETURNING *`,
      [invoiceId, newRefundedTotal, reason, newStatus]
    );
    return { ok: true, invoice: updated[0] };
  });
}

// --- Reporting ---

/**
 * MRR/ARR and subscriber counts computed with a single aggregate SQL query
 * instead of looping over every user in application code — the original
 * implementation loaded every user into memory and iterated in JS, which
 * doesn't scale past a few thousand users. This scales with an index scan
 * regardless of user count.
 */
export async function getBillingReportMetrics(c?: PoolClient) {
  const conn = client(c);
  const [subscriberStats, revenueStats] = await Promise.all([
    conn.query(`
      SELECT
        COUNT(*) FILTER (WHERE trial_active) AS trial_users,
        COUNT(*) FILTER (WHERE plan != 'free' AND billing_status = 'active' AND NOT trial_active) AS active_subscribers,
        COUNT(*) FILTER (WHERE plan != 'free' AND billing_status = 'past_due') AS past_due_subscribers,
        COALESCE(SUM(
          CASE WHEN plan != 'free' AND billing_status = 'active' AND NOT trial_active THEN
            CASE WHEN billing_cycle = 'annual' THEN ROUND(p.annual_price_cents / 12.0) ELSE p.monthly_price_cents END
          ELSE 0 END
        ), 0) AS mrr_cents
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan::text
      WHERE u.deleted_at IS NULL
    `),
    conn.query(`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0) AS total_revenue_cents,
        COALESCE(SUM(refunded_amount_cents), 0) AS refunded_revenue_cents
      FROM invoices
    `),
  ]);

  const s = subscriberStats.rows[0];
  const r = revenueStats.rows[0];
  const mrrCents = Number(s.mrr_cents);

  return {
    mrrCents,
    arrCents: mrrCents * 12,
    activeSubscribers: Number(s.active_subscribers),
    pastDueSubscribers: Number(s.past_due_subscribers),
    trialUsers: Number(s.trial_users),
    totalRevenueCents: Number(r.total_revenue_cents),
    refundedRevenueCents: Number(r.refunded_revenue_cents),
  };
}
