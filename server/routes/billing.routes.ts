/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Billing routes rewritten against the repository layer. Money-relevant
 * fixes applied during this migration (not just a storage-backend swap):
 *
 * - Coupon and promo-code redemption use billingRepo.redeemCoupon /
 *   redeemPromoCode, which take a row lock (FOR UPDATE) for the duration
 *   of the check-and-increment, closing the race where two concurrent
 *   requests could both read "under the usage limit" and both succeed.
 * - Credit grants/consumption go through the append-only credit_transactions
 *   ledger instead of mutating a cached balance field directly - a
 *   database-level CHECK constraint makes overdraft impossible even under
 *   concurrent spend from multiple devices.
 * - Webhook idempotency uses a UNIQUE constraint instead of an in-memory
 *   array `.includes()` check.
 * - All currency handled in integer cents internally; routes still accept/
 *   return dollars at the API boundary to match the existing frontend
 *   contract, converting at the edge.
 */

import { Router } from 'express';
import { wrapAsyncRouter } from '../middleware/asyncHandler.ts';
import crypto from 'crypto';
import { usersRepo, billingRepo, auditRepo } from '../db/index.ts';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.ts';
import { BILLING_PLANS, sendBillingEmailSim, generateInvoicePDF, executeSubscriptionLapseCheck } from '../billingEngine';
import { evaluateFraudRisk, sendWebhookEvent, WEBHOOK_SECRET } from '../billingGateway';
import { runProgrammaticTestSuite, latestTestResults } from '../testBilling';
import type { PaymentDetails } from '../billingGateway';

const router = wrapAsyncRouter(Router());

const dollarsToCents = (d: number) => Math.round(d * 100);
const centsToDollars = (c: number) => Number((c / 100).toFixed(2));

router.post('/upgrade', requireAuth, async (req: any, res) => {
  const { plan, billing_cycle, paymentDetails, couponCode } = req.body ?? {};
  if (!plan || !['free', 'plus', 'pro', 'teams', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan choice.' });
  }

  const user = await usersRepo.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User record not found.' });

  if (plan === 'free') {
    const updated = await usersRepo.updateUser(user.id, {
      plan: 'free', billing_status: 'inactive', billing_cycle: billing_cycle || 'monthly',
      trial_active: false, trial_expires_at: null, billing_canceled: false, billing_paused: false,
    });
    await auditRepo.logSecurityEvent(user.id, req.ip, 'billing.downgrade', 'Subscription downgraded to Free Starter.');
    await sendBillingEmailSim(user.id, user.email, user.name, 'trial_expired', { planName: 'Free Starter' });
    return res.json({ success: true, user: usersRepo.sanitizeUser(updated!) });
  }

  const targetPlan = await billingRepo.getPlan(plan);
  if (!targetPlan) return res.status(400).json({ error: 'Plan details not configured in server repository.' });

  const isAnnual = billing_cycle === 'annual';
  const originalAmountCents = isAnnual ? targetPlan.annual_price_cents : targetPlan.monthly_price_cents;
  let amountCents = originalAmountCents;
  let appliedCouponCode: string | null = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
    const coupon = await billingRepo.findCoupon(couponCode);
    if (!coupon) return res.status(400).json({ error: 'Invalid coupon or promotional code.' });
    if (new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'This coupon code has expired.' });
    if (coupon.times_used >= coupon.usage_limit) return res.status(400).json({ error: 'Coupon utilization limit exceeded.' });
    if (coupon.single_use_per_user && await billingRepo.hasUserRedeemedCoupon(coupon.code, user.id)) {
      return res.status(400).json({ error: 'You have already redeemed this single-use coupon.' });
    }

    const discountCents = coupon.discount_type === 'percentage'
      ? Math.round(originalAmountCents * (coupon.discount_value / 100))
      : Math.min(originalAmountCents, coupon.discount_value);
    amountCents = Math.max(0, originalAmountCents - discountCents);
    appliedCouponCode = coupon.code;
  }

  const payment: PaymentDetails = paymentDetails || { method: 'card', cardNumber: '4222 2222 2222 2222', cardExpiry: '12/28', cardCvv: '123', zipCode: '10001', country: 'US' };
  const fraudCheck = await evaluateFraudRisk(user.id, centsToDollars(amountCents), payment, req.ip);
  if (fraudCheck.block) {
    await auditRepo.logSecurityEvent(user.id, req.ip, 'security.fraud_blocked', `Payment blocked by Risk Engine. Reason: ${fraudCheck.reason}. Score: ${fraudCheck.fraudScore}`);
    return res.status(403).json({ error: `Transaction Blocked: ${fraudCheck.reason}`, fraudScore: fraudCheck.fraudScore, blockedByFraudGuard: true });
  }

  console.log(`[GATEWAY SIMULATOR] Processing $${centsToDollars(amountCents)} payment for user ${user.email} using ${payment.method.toUpperCase()}...`);

  if (appliedCouponCode) {
    const result = await billingRepo.redeemCoupon(appliedCouponCode, user.id);
    if (!result.ok && 'reason' in result) {
      return res.status(400).json({ error: `Coupon could not be applied: ${result.reason}` });
    }
  }

  const invoiceId = 'inv_' + crypto.randomBytes(6).toString('hex');
  const invoiceNum = `HIL-${isAnnual ? 'ANN' : 'MON'}-${Math.floor(1000 + Math.random() * 9000)}`;
  await billingRepo.createInvoice({
    id: invoiceId, userId: user.id, invoiceNumber: invoiceNum, amountCents, currency: 'USD',
    status: 'paid', planId: plan, billingCycle: isAnnual ? 'annual' : 'monthly',
  });

  const updated = await usersRepo.updateUser(user.id, {
    plan, billing_status: 'active', billing_cycle: isAnnual ? 'annual' : 'monthly',
    billing_canceled: false, billing_paused: false, trial_active: false,
  });

  await auditRepo.logSecurityEvent(user.id, req.ip, 'billing.upgrade_completed', `Successfully upgraded to ${plan} plan for $${centsToDollars(amountCents)}`);
  await sendBillingEmailSim(user.id, user.email, user.name, 'payment_success', {
    planName: targetPlan.name, amount: centsToDollars(amountCents), transactionId: 'ch_' + crypto.randomBytes(8).toString('hex'), invoiceNumber: invoiceNum,
  });
  await sendWebhookEvent('invoice.paid', { userId: user.id, amount: centsToDollars(amountCents), plan, billingCycle: isAnnual ? 'annual' : 'monthly', invoiceId });

  res.json({ success: true, user: usersRepo.sanitizeUser(updated!) });
});

router.get('/plans', requireAuth, async (req, res) => {
  const plans = await billingRepo.listActivePlans();
  res.json({ success: true, plans });
});

router.post('/cancel', requireAuth, async (req: any, res) => {
  const updated = await usersRepo.updateUser(req.user.id, { billing_canceled: true });
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  const plan = await billingRepo.getPlan(updated.plan);
  await auditRepo.logSecurityEvent(updated.id, req.ip, 'billing.subscription_canceled_auto_renew', 'Disabled auto-renewal on billing subscription.');
  await sendBillingEmailSim(updated.id, updated.email, updated.name, 'subscription_canceled', { planName: plan?.name || updated.plan, endDate: 'the end of your current cycle' });
  res.json({ success: true, user: usersRepo.sanitizeUser(updated), message: 'Your subscription will not renew, but you maintain full features until the end of the billing period.' });
});

router.post('/resume', requireAuth, async (req: any, res) => {
  const updated = await usersRepo.updateUser(req.user.id, { billing_canceled: false });
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  await auditRepo.logSecurityEvent(updated.id, req.ip, 'billing.subscription_reactivated', 'Reactivated subscription auto-renewal.');
  await sendBillingEmailSim(updated.id, updated.email, updated.name, 'subscription_reactivated', {});
  res.json({ success: true, user: usersRepo.sanitizeUser(updated), message: 'Subscription auto-renewal successfully reactivated.' });
});

router.post('/pause', requireAuth, async (req: any, res) => {
  const updated = await usersRepo.updateUser(req.user.id, { billing_paused: true });
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  await auditRepo.logSecurityEvent(updated.id, req.ip, 'billing.subscription_paused', 'Paused subscription billing.');
  res.json({ success: true, user: usersRepo.sanitizeUser(updated), message: 'Subscription successfully paused. All features will align to the Free plan on your next billing date. Resume at any time with zero data loss.' });
});

router.post('/resume-billing', requireAuth, async (req: any, res) => {
  const updated = await usersRepo.updateUser(req.user.id, { billing_paused: false });
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  await auditRepo.logSecurityEvent(updated.id, req.ip, 'billing.subscription_resumed_billing', 'Resumed subscription billing.');
  res.json({ success: true, user: usersRepo.sanitizeUser(updated), message: 'Subscription successfully resumed! Instant access restored.' });
});

router.post('/coupon/validate', requireAuth, async (req: any, res) => {
  const { code, plan, billing_cycle } = req.body ?? {};
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Coupon code parameter is required.' });

  const coupon = await billingRepo.findCoupon(code);
  if (!coupon) return res.status(404).json({ error: 'Invalid promo code. Coupon not found.' });
  if (new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'This coupon code has expired.' });
  if (coupon.times_used >= coupon.usage_limit) return res.status(400).json({ error: 'This coupon utilization limit is exceeded.' });
  if (coupon.single_use_per_user && await billingRepo.hasUserRedeemedCoupon(coupon.code, req.user.id)) {
    return res.status(400).json({ error: 'You have already redeemed this single-use coupon.' });
  }

  let originalAmountCents = 0;
  if (plan) {
    const targetPlan = await billingRepo.getPlan(plan);
    if (targetPlan) originalAmountCents = billing_cycle === 'annual' ? targetPlan.annual_price_cents : targetPlan.monthly_price_cents;
  }
  const previewDiscountCents = originalAmountCents > 0
    ? (coupon.discount_type === 'percentage' ? Math.round(originalAmountCents * (coupon.discount_value / 100)) : Math.min(originalAmountCents, coupon.discount_value))
    : 0;

  res.json({
    success: true,
    coupon: { code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value, expiresAt: coupon.expires_at },
    previewDiscountAmount: centsToDollars(previewDiscountCents),
    previewFinalAmount: centsToDollars(Math.max(0, originalAmountCents - previewDiscountCents)),
  });
});

router.post('/credits/buy', requireAuth, async (req: any, res) => {
  const { amount, cost, paymentDetails } = req.body ?? {};
  if (!amount || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Valid credit purchase amount is required.' });

  const user = await usersRepo.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const actualCost = cost || Number((amount * 0.15).toFixed(2));
  const payment: PaymentDetails = paymentDetails || { method: 'card', cardNumber: '4111 1111 1111 1111', cardExpiry: '12/28', cardCvv: '123', zipCode: '10001', country: 'US' };

  const fraudCheck = await evaluateFraudRisk(user.id, actualCost, payment, req.ip);
  if (fraudCheck.block) {
    await auditRepo.logSecurityEvent(user.id, req.ip, 'security.fraud_blocked', `Credit purchase blocked by Risk Guard. Reason: ${fraudCheck.reason}`);
    return res.status(403).json({ error: `Transaction Blocked: ${fraudCheck.reason}`, blockedByFraudGuard: true });
  }

  await billingRepo.grantCredits(user.id, amount, `Purchased ${amount} Communication Credits`);

  const invoiceId = 'inv_' + crypto.randomBytes(6).toString('hex');
  const invoiceNum = `HIL-CRED-${Math.floor(1000 + Math.random() * 9000)}`;
  await billingRepo.createInvoice({
    id: invoiceId, userId: user.id, invoiceNumber: invoiceNum, amountCents: dollarsToCents(actualCost),
    currency: 'USD', status: 'paid', planId: user.plan, billingCycle: user.billing_cycle || 'monthly',
  });

  await auditRepo.logSecurityEvent(user.id, req.ip, 'billing.credits_purchased', `Purchased ${amount} credits for $${actualCost}`);
  await sendBillingEmailSim(user.id, user.email, user.name, 'payment_success', {
    planName: `${amount} Communication Credits`, amount: actualCost, transactionId: 'ch_' + crypto.randomBytes(8).toString('hex'), invoiceNumber: invoiceNum,
  });
  await sendWebhookEvent('invoice.paid', { userId: user.id, amount: actualCost, plan: user.plan, invoiceId });

  const updated = await usersRepo.findUserById(user.id);
  res.json({ success: true, user: usersRepo.sanitizeUser(updated!) });
});

router.post('/credits/consume', requireAuth, async (req: any, res) => {
  const { amount, feature } = req.body ?? {};
  if (!amount || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Valid credit amount is required.' });

  try {
    await billingRepo.consumeCredits(req.user.id, amount, `Consumed ${amount} credits for ${feature || 'Premium Engine Feature'}`);
  } catch (err) {
    if (err instanceof billingRepo.InsufficientCreditsError) {
      const current = await usersRepo.findUserById(req.user.id);
      return res.status(403).json({ error: `Insufficient Credits: This action requires ${amount} credits, but you only have ${current?.credit_balance ?? 0}. Please top-up.` });
    }
    throw err;
  }

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'billing.credits_consumed', `Consumed ${amount} credits for ${feature}`);
  const updated = await usersRepo.findUserById(req.user.id);
  res.json({ success: true, user: usersRepo.sanitizeUser(updated!) });
});

router.post('/packs/buy', requireAuth, async (req: any, res) => {
  const { packId } = req.body ?? {};
  if (!packId) return res.status(400).json({ error: 'Premium pack identifier is required.' });

  const result: Awaited<ReturnType<typeof billingRepo.purchasePremiumPack>> = await billingRepo.purchasePremiumPack(req.user.id, packId);
  if (!result.ok && 'reason' in result) {
    const messages: Record<string, string> = {
      already_owned: 'You already own this permanent Premium Pack.',
      insufficient_credits: 'Insufficient Credits: Please buy more credits first.',
      pack_not_found: 'This premium pack does not exist or is no longer available.',
    };
    const statusCode = result.reason === 'already_owned' ? 400 : result.reason === 'pack_not_found' ? 404 : 403;
    return res.status(statusCode).json({ error: messages[result.reason] });
  }

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'billing.pack_unlocked', `Unlocked premium pack: ${packId}`);
  const updated = await usersRepo.findUserById(req.user.id);
  res.json({ success: true, user: usersRepo.sanitizeUser(updated!) });
});

router.post('/promotions/apply', requireAuth, async (req: any, res) => {
  const { code } = req.body ?? {};
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Promotion or coupon code is required.' });

  const result: Awaited<ReturnType<typeof billingRepo.redeemPromoCode>> = await billingRepo.redeemPromoCode(code, req.user.id);
  if (!result.ok && 'reason' in result) {
    const messages: Record<string, string> = {
      not_found: 'Invalid coupon or promotional code. Please check for spelling mistakes.',
      inactive: 'This promotional code is no longer active.',
      expired: 'This promotional code has expired.',
      already_used: 'This coupon or promotional code has already been applied to your account.',
    };
    return res.status(400).json({ error: messages[result.reason] });
  }

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'billing.promotion_applied', `Applied promotion code: ${result.promo.code}`);
  const updated = await usersRepo.findUserById(req.user.id);
  res.json({ success: true, user: usersRepo.sanitizeUser(updated!), message: `${result.promo.description} Gained ${result.promo.bonus_credits} free Communication Credits.` });
});

router.post('/trial/activate', requireAuth, async (req: any, res) => {
  const days = req.body?.durationDays || 7;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  const updated = await usersRepo.updateUser(req.user.id, {
    trial_active: true, trial_expires_at: expiryDate, trial_duration_days: days, plan: 'pro', billing_status: 'active',
  });
  if (!updated) return res.status(404).json({ error: 'User not found.' });

  await auditRepo.logSecurityEvent(updated.id, req.ip, 'billing.trial_started', `Activated a ${days}-day free trial.`);
  await sendBillingEmailSim(updated.id, updated.email, updated.name, 'payment_success', {
    planName: 'Pro Sovereign Free Trial', amount: 0, transactionId: 'trial_init', invoiceNumber: `HIL-TRIAL-${Math.floor(1000 + Math.random() * 9000)}`,
  });
  res.json({ success: true, user: usersRepo.sanitizeUser(updated) });
});

router.post('/trial/cancel', requireAuth, async (req: any, res) => {
  const updated = await usersRepo.updateUser(req.user.id, { trial_active: false, trial_expires_at: null, plan: 'free', billing_status: 'inactive' });
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  await auditRepo.logSecurityEvent(updated.id, req.ip, 'billing.trial_canceled', 'Canceled/ended free trial.');
  await sendBillingEmailSim(updated.id, updated.email, updated.name, 'trial_expired', { planName: 'Pro Sovereign Free Trial' });
  res.json({ success: true, user: usersRepo.sanitizeUser(updated) });
});

router.get('/invoices/:id/download', requireAuth, async (req: any, res) => {
  const invoice = await billingRepo.getInvoice(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  if (invoice.user_id !== req.user.id && !isAdmin) {
    return res.status(403).json({ error: 'Access denied: You do not have permissions to access this invoice.' });
  }
  const owner = await usersRepo.findUserById(invoice.user_id);
  if (!owner) return res.status(404).json({ error: 'Invoice owner not found.' });

  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
    await generateInvoicePDF(
      { invoice_number: invoice.invoice_number, created_at: invoice.created_at, status: invoice.status, amount: centsToDollars(invoice.amount_cents), plan: invoice.plan_id, billing_cycle: invoice.billing_cycle },
      { name: owner.name, email: owner.email, billing_customer_id: owner.billing_customer_id },
      res
    );
  } catch (err: any) {
    console.error('[PDF ENGINE] PDF compilation failed:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to compile invoice document.' });
  }
});

// Signature verification stays identical to the original (HMAC-SHA256 +
// timingSafeEqual is correct as written) - only the idempotency storage
// backend changes, from an array `.includes()` check to a UNIQUE
// constraint (race-safe under concurrent webhook delivery).
// Webhook receiver: exported separately because it must mount at
// /api/webhooks/gateway (root), not /api/billing/webhooks/gateway —
// matching the path payment-gateway webhook configs actually point at.
export const webhookRouter = wrapAsyncRouter(Router());
webhookRouter.post('/webhooks/gateway', async (req, res) => {
  const signature = req.headers['x-gateway-signature'] as string;
  const eventId = req.headers['x-gateway-event-id'] as string;
  if (!signature || !eventId) return res.status(401).json({ error: 'Missing webhook signature credentials.' });

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  const providedHash = signature.replace('sha256=', '');

  const providedBuf = Buffer.from(providedHash);
  const expectedBuf = Buffer.from(expectedSignature);
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    console.error('[GATEWAY WEBHOOK] Cryptographic signature check failed!');
    return res.status(401).json({ error: 'Signature authentication failed.' });
  }

  const isNew = await billingRepo.markWebhookProcessed(eventId, req.body?.event ?? 'unknown', req.body);
  if (!isNew) {
    console.log(`[GATEWAY WEBHOOK] Event ${eventId} already processed. Skipping duplicate payload.`);
    return res.json({ success: true, skippedDuplicate: true });
  }

  const { event, data } = req.body ?? {};
  console.log(`[GATEWAY WEBHOOK] Successfully verified event ${event} (ID: ${eventId}). Processing ledger mutations...`);

  if (data?.userId) {
    if (event === 'invoice.paid') {
      await usersRepo.updateUser(data.userId, { billing_status: 'active', billing_paused: false, billing_canceled: false });
    } else if (event === 'invoice.payment_failed') {
      await usersRepo.updateUser(data.userId, { billing_status: 'past_due' });
    }
  }

  res.json({ success: true, processedEvent: event });
});

// --- Admin billing ---
// Exported as a separate router because these mount at /api/admin/billing
// in server.ts, not /api/billing/admin — matching the original path
// structure the frontend already calls.
export const adminBillingRouter = wrapAsyncRouter(Router());

adminBillingRouter.post('/plans/configure', requireAdmin, async (req: any, res) => {
  const { planId, monthlyPrice, annualPrice, tagline } = req.body ?? {};
  if (!planId) return res.status(400).json({ error: 'Plan ID is required to configure billing plans.' });

  const updated = await billingRepo.updatePlan(planId, {
    monthlyPriceCents: monthlyPrice !== undefined ? dollarsToCents(Number(monthlyPrice)) : undefined,
    annualPriceCents: annualPrice !== undefined ? dollarsToCents(Number(annualPrice)) : undefined,
    tagline,
  });
  if (!updated) return res.status(404).json({ error: 'Billing plan details not found.' });

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.billing_plan_configured', `Modified plan parameters for ID: ${planId}`);
  const plans = await billingRepo.listActivePlans();
  res.json({ success: true, plans });
});

adminBillingRouter.post('/test-suite/run', requireAdmin, async (req, res) => {
  try {
    const testResults = await runProgrammaticTestSuite();
    res.json({ success: true, results: testResults });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to complete test suite sweep: ' + err.message });
  }
});

adminBillingRouter.get('/test-suite/results', requireAdmin, (req, res) => {
  res.json({ success: true, results: latestTestResults });
});

adminBillingRouter.post('/sync', requireAdmin, async (req, res) => {
  try {
    const result = await executeSubscriptionLapseCheck();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminBillingRouter.get('/reports', requireAdmin, async (req, res) => {
  const metrics = await billingRepo.getBillingReportMetrics();
  const auditLogs = await auditRepo.listAuditLogsByEventPrefixes(['billing.', 'security.fraud'], 50);
  res.json({
    metrics: {
      mrr: centsToDollars(metrics.mrrCents),
      arr: centsToDollars(metrics.arrCents),
      activeSubscribers: metrics.activeSubscribers,
      pastDueSubscribers: metrics.pastDueSubscribers,
      trialUsers: metrics.trialUsers,
      totalRevenue: centsToDollars(metrics.totalRevenueCents),
      refundedRevenue: centsToDollars(metrics.refundedRevenueCents),
    },
    auditLogs,
  });
});

adminBillingRouter.post('/refund', requireAdmin, async (req: any, res) => {
  const { invoiceId, cancelSubscription, amount, reason } = req.body ?? {};
  if (!invoiceId) return res.status(400).json({ error: 'Invoice identifier is required.' });

  const invoice = await billingRepo.getInvoice(invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice or associated user not found.' });
  const user = await usersRepo.findUserById(invoice.user_id);
  if (!user) return res.status(404).json({ error: 'Invoice or associated user not found.' });

  if (invoice.status === 'refunded') return res.status(400).json({ error: 'This invoice has already been fully refunded.' });

  const maxRefundable = centsToDollars(invoice.amount_cents - invoice.refunded_amount_cents);
  const refundAmount = amount !== undefined ? Number(amount) : maxRefundable;
  if (isNaN(refundAmount) || refundAmount <= 0) return res.status(400).json({ error: 'Refund amount must be a positive number.' });
  if (refundAmount > maxRefundable) return res.status(400).json({ error: `Refund amount exceeds maximum remaining refundable balance of $${maxRefundable}.` });

  const refundReason = reason || 'Customer Satisfaction Request';
  const result = await billingRepo.refundInvoice(invoiceId, dollarsToCents(refundAmount), refundReason);
  if (!result.ok) return res.status(400).json({ error: 'Refund could not be processed.' });

  await auditRepo.logSecurityEvent(user.id, req.ip, 'billing.invoice_refunded', `Refunded $${refundAmount} (Reason: ${refundReason}) for invoice ${invoice.invoice_number}`);

  let updatedUser = user;
  if (cancelSubscription || result.invoice.status === 'refunded') {
    updatedUser = (await usersRepo.updateUser(user.id, { plan: 'free', billing_status: 'inactive', billing_canceled: false, billing_paused: false }))!;
    await auditRepo.logSecurityEvent(user.id, req.ip, 'billing.subscription_canceled_by_refund', `Revoked subscription following refund of ${invoice.invoice_number}`);
  }

  await sendBillingEmailSim(user.id, user.email, user.name, 'payment_failed', {
    planName: invoice.plan_id, amount: refundAmount,
    reason: `Refund processed: $${refundAmount} has been credited back. Status: ${result.invoice.status.toUpperCase()}. Reason: ${refundReason}`,
  });

  res.json({ success: true, message: `Successfully refunded $${refundAmount} to user ${user.email}.`, user: usersRepo.sanitizeUser(updatedUser) });
});

export default router;
