/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration verification script for the data-access layer. Rerun this
 * against any environment (local, staging) after schema changes or before
 * a deploy that touches server/db/**. Requires DATABASE_URL to point at a
 * disposable database — it creates and mutates real rows.
 *
 * Usage: DATABASE_URL=postgresql://... npx tsx scripts/verify_db_layer.ts
 *
 * This is a smoke test, not a substitute for the unit/integration test
 * suite (see Phase: Testing) — it checks that the repository layer's core
 * concurrency guarantees hold against a real database, not every code path.
 */
import { usersRepo, sessionsRepo, billingRepo, analysesRepo, tokensRepo, auditRepo, checkDatabaseHealth, closePool } from '../server/db/index.ts';
import { InsufficientCreditsError } from '../server/db/repositories/billing.repo';
import crypto from 'crypto';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function main() {
  const health = await checkDatabaseHealth();
  assert(health.healthy, `DB should be healthy: ${health.error}`);
  console.log('✓ health check', health);

  const email = `smoketest_${Date.now()}@example.com`;
  const user = await usersRepo.createUser({
    id: 'smoke_' + crypto.randomBytes(6).toString('hex'),
    name: 'Smoke Test',
    email,
    passwordHash: 'hash',
    passwordSalt: 'salt',
  });
  assert(user.email.toLowerCase() === email.toLowerCase(), 'created user email matches');
  console.log('✓ createUser', user.id);

  // CITEXT case-insensitive lookup
  const foundByUpper = await usersRepo.findUserByEmail(email.toUpperCase());
  assert(foundByUpper?.id === user.id, 'case-insensitive email lookup works');
  console.log('✓ findUserByEmail case-insensitive');

  // updateUser whitelisting
  const updated = await usersRepo.updateUser(user.id, { name: 'Updated Name', plan: 'pro' });
  assert(updated?.name === 'Updated Name' && updated?.plan === 'pro', 'updateUser applied whitelisted fields');
  console.log('✓ updateUser');

  // atomic increment
  await usersRepo.incrementUsageCount(user.id, 3);
  const afterInc = await usersRepo.findUserById(user.id);
  assert(afterInc?.usage_count_month === 3, `usage_count_month should be 3, got ${afterInc?.usage_count_month}`);
  console.log('✓ incrementUsageCount');

  // sessions
  const token = await sessionsRepo.createSession(user.id, 3600, 'test-agent', '127.0.0.1');
  const session = await sessionsRepo.lookupSession(token);
  assert(session?.user_id === user.id, 'session lookup resolves to correct user');
  await sessionsRepo.revokeSession(token);
  const revoked = await sessionsRepo.lookupSession(token);
  assert(revoked === null, 'revoked session should not resolve');
  console.log('✓ sessions create/lookup/revoke');

  // password reset token single-use
  const resetToken = await tokensRepo.createPasswordResetToken(user.id, 900);
  const consumed1 = await tokensRepo.consumePasswordResetToken(resetToken);
  assert(consumed1?.userId === user.id, 'first consume succeeds');
  const consumed2 = await tokensRepo.consumePasswordResetToken(resetToken);
  assert(consumed2 === null, 'second consume of same token must fail (single-use)');
  console.log('✓ password reset token single-use enforced');

  // credit ledger + trigger-maintained balance
  await billingRepo.grantCredits(user.id, 100, 'smoke test grant');
  let afterGrant = await usersRepo.findUserById(user.id);
  assert(afterGrant?.credit_balance === 100, `balance should be 100, got ${afterGrant?.credit_balance}`);
  console.log('✓ grantCredits updates cached balance via trigger');

  await billingRepo.consumeCredits(user.id, 40, 'smoke test spend');
  const afterConsume = await usersRepo.findUserById(user.id);
  assert(afterConsume?.credit_balance === 60, `balance should be 60, got ${afterConsume?.credit_balance}`);
  console.log('✓ consumeCredits updates cached balance via trigger');

  let overdraftBlocked = false;
  try {
    await billingRepo.consumeCredits(user.id, 1000, 'should fail');
  } catch (err) {
    overdraftBlocked = err instanceof InsufficientCreditsError;
  }
  assert(overdraftBlocked, 'consuming more credits than balance must throw InsufficientCreditsError');
  console.log('✓ overdraft protection enforced');

  // promo code single redemption under concurrency
  const promoResults = await Promise.all([
    billingRepo.redeemPromoCode('LAUNCH50', user.id),
    billingRepo.redeemPromoCode('LAUNCH50', user.id),
  ]);
  const successes = promoResults.filter((r) => r.ok);
  assert(successes.length === 1, `exactly one concurrent promo redemption should succeed, got ${successes.length}`);
  console.log('✓ concurrent promo code redemption: exactly one winner (race-safe)');

  const balanceAfterPromo = await usersRepo.findUserById(user.id);
  assert(balanceAfterPromo?.credit_balance === 60 + 50, 'balance reflects exactly one promo grant, not two');
  console.log('✓ balance correct after concurrent redemption (no double-grant)');

  // webhook idempotency under concurrency
  const webhookEventId = 'evt_smoke_' + crypto.randomBytes(6).toString('hex');
  const webhookResults = await Promise.all([
    billingRepo.markWebhookProcessed(webhookEventId, 'invoice.paid', { foo: 'bar' }),
    billingRepo.markWebhookProcessed(webhookEventId, 'invoice.paid', { foo: 'bar' }),
  ]);
  const firstTimeCount = webhookResults.filter(Boolean).length;
  assert(firstTimeCount === 1, `exactly one concurrent webhook insert should report "first time", got ${firstTimeCount}`);
  console.log('✓ concurrent webhook delivery: exactly one processed as new (idempotency-safe)');

  // analyses
  const analysis = await analysesRepo.createAnalysis({
    id: 'an_' + crypto.randomBytes(6).toString('hex'),
    userId: user.id,
    originalMessage: 'Hey, just checking in on the project status.',
    toneSettings: { warmth: 50 },
    outputJson: { summary: { overall_read: 'neutral', landing_status: 'neutral', top_risks: [], top_strengths: [], recommended_move: 'send' }, scores: [], how_it_may_be_read: {}, whats_working: [], whats_risky: [], line_by_line: [], rewrites: [], follow_ups: [], send_recommendation: {}, tags: [] },
  });
  const fetched = await analysesRepo.getAnalysisForUser(analysis.id, user.id);
  assert(fetched?.id === analysis.id, 'analysis fetch scoped to owning user works');

  // authorization boundary: a different user must NOT be able to fetch it
  const otherUser = await usersRepo.createUser({
    id: 'smoke_other_' + crypto.randomBytes(6).toString('hex'),
    name: 'Other User',
    email: `other_${Date.now()}@example.com`,
    passwordHash: 'hash',
    passwordSalt: 'salt',
  });
  const stolen = await analysesRepo.getAnalysisForUser(analysis.id, otherUser.id);
  assert(stolen === null, 'a user must not be able to fetch another user\'s analysis by ID');
  console.log('✓ analyses: created, fetched, and cross-user access correctly denied');

  // audit log
  await auditRepo.logSecurityEvent(user.id, '127.0.0.1', 'smoke.test_event', 'smoke test detail');
  const logs = await auditRepo.listAuditLogs({ userId: user.id, limit: 10, offset: 0 });
  assert(logs.length > 0, 'audit log entry should be queryable');
  console.log('✓ audit log write + read');

  console.log('\nALL SMOKE TESTS PASSED');
  await closePool();
}

main().catch(async (err) => {
  console.error('SMOKE TEST FAILED:', err);
  await closePool();
  process.exit(1);
});
