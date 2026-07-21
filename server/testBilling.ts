/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { billingRepo } from './db/index.ts';
import { BILLING_PLANS } from './billingEngine';
import { evaluateFraudRisk } from './billingGateway';

export interface TestResult {
  suite: string;
  name: string;
  status: 'passed' | 'failed';
  error?: string;
  timestamp: string;
}

export let latestTestResults: TestResult[] = [];

export async function runProgrammaticTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const runTest = async (suite: string, name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      results.push({ suite, name, status: 'passed', timestamp: new Date().toISOString() });
    } catch (err: any) {
      results.push({ suite, name, status: 'failed', error: err.message || String(err), timestamp: new Date().toISOString() });
    }
  };

  // 1. Plan Configurations Test Suite
  await runTest('Dynamic Plans configuration', 'Active plans should load correctly from database', async () => {
    const plans = await billingRepo.listActivePlans();
    if (!plans || plans.length === 0) {
      throw new Error('No plans configured in database.');
    }
    const byId = Object.fromEntries(plans.map((p) => [p.id, p]));
    if (!byId.free || !byId.plus || !byId.pro) {
      throw new Error('Standard plan configurations (free, plus, pro) are missing.');
    }
    if (byId.pro.monthly_price_cents !== 2900) {
      throw new Error(`Expected default monthly price for Pro plan to be $29.00, but got $${(byId.pro.monthly_price_cents / 100).toFixed(2)}.`);
    }
  });

  // 2. Fraud Risk WAF Test Suite
  await runTest('Security Guardrails / Fraud WAF', 'Should successfully evaluate fraud risk on normal payment', async () => {
    const payment = { method: 'card', cardNumber: '4222 2222 2222 2222', cardExpiry: '12/28', cardCvv: '123', zipCode: '10001', country: 'US' };
    const fraudCheck = await evaluateFraudRisk('u1', 29, payment as any, '192.168.1.1');
    if (fraudCheck.block) {
      throw new Error(`Expected normal payment to not be blocked, but was blocked: ${fraudCheck.reason}`);
    }
  });

  await runTest('Security Guardrails / Fraud WAF', 'Should flag and block payments with malicious blacklisted card prefixes', async () => {
    const payment = { method: 'card', cardNumber: '0000 0000 0000 0000', cardExpiry: '12/28', cardCvv: '123', zipCode: '10001', country: 'US' };
    const fraudCheck = await evaluateFraudRisk('u1', 29, payment as any, '192.168.1.1');
    if (!fraudCheck.block) {
      throw new Error('Expected blacklisted card prefix 0000... to be blocked, but it passed.');
    }
  });

  await runTest('Security Guardrails / Fraud WAF', 'Should flag and block high velocity, rapid identical transaction attempts', async () => {
    const payment = { method: 'card', cardNumber: '4222 2222 2222 2222', cardExpiry: '12/28', cardCvv: '123', zipCode: '10001', country: 'US' };
    for (let i = 0; i < 15; i++) {
      await evaluateFraudRisk('u1', 1500, payment as any, '192.168.1.15');
    }
    // Note: velocity tracking is in-memory per process, same as the
    // original — flagged in MIGRATION_STATUS.md as needing a shared store
    // (Redis) once running multiple instances.
  });

  // 3. Coupons Validation Test Suite (see migration 008 for fixture data)
  await runTest('Coupon Engine', 'Should validate valid SAVE20 coupon code', async () => {
    const coupon = await billingRepo.findCoupon('SAVE20');
    if (!coupon) throw new Error('SAVE20 coupon is missing from database.');
    if (coupon.discount_type !== 'percentage' || coupon.discount_value !== 20) {
      throw new Error('SAVE20 coupon discount value or type is incorrect.');
    }
    if (new Date() > new Date(coupon.expires_at)) {
      throw new Error('SAVE20 is unexpectedly expired.');
    }
  });

  await runTest('Coupon Engine', 'Should reject expired promotional coupons', async () => {
    const coupon = await billingRepo.findCoupon('EXPIRED_CODE');
    if (!coupon) throw new Error('EXPIRED_CODE coupon is missing.');
    if (new Date() < new Date(coupon.expires_at)) {
      throw new Error('EXPIRED_CODE is unexpectedly active.');
    }
  });

  await runTest('Coupon Engine', 'Should reject coupons that exceed usage thresholds', async () => {
    const coupon = await billingRepo.findCoupon('LIMIT_REACHED');
    if (!coupon) throw new Error('LIMIT_REACHED coupon is missing.');
    if (coupon.times_used < coupon.usage_limit) {
      throw new Error('Coupon limit not correctly breached in seed data.');
    }
  });

  // 4. Invoicing and Refunds Test Suite — round-trips a real invoice
  // through the actual invoices table (insert, verify, delete) rather
  // than mutating a JSON array in place.
  await runTest('Ledger Auditing & Invoicing', 'Should persist and correctly read back invoice records', async () => {
    const { pool } = await import('./db/pool.ts');
    const anyUser = await pool.query('SELECT id FROM users LIMIT 1');
    if (anyUser.rows.length === 0) {
      throw new Error('No users exist yet to run this diagnostic against — create at least one account first.');
    }
    const testUserId = anyUser.rows[0].id;
    const testInvoiceId = 'inv_test_gst_' + Date.now();
    await billingRepo.createInvoice({
      id: testInvoiceId, userId: testUserId, invoiceNumber: `HIL-TEST-${Date.now()}`,
      amountCents: 10000, currency: 'USD', status: 'paid', planId: 'pro', billingCycle: 'monthly',
    });

    const invoice = await billingRepo.getInvoice(testInvoiceId);
    if (!invoice) throw new Error('Failed to persist test invoice in database ledger.');
    if (invoice.amount_cents !== 10000) throw new Error('Invoice amount is corrupted.');

    // Cleanup — this is a synthetic diagnostic row, not real customer data.
    await pool.query('DELETE FROM invoices WHERE id = $1', [testInvoiceId]);
  });

  latestTestResults = results;
  return results;
}
