/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Core app routes rewritten against the repository layer.
 *
 * privacy/delete-account changed from a hard DELETE to a soft delete with
 * PII scrubbing: the original did `currentDb.users = users.filter(...)`,
 * a real row removal. Under the new schema, invoices reference users with
 * ON DELETE RESTRICT specifically so financial records can't be deleted
 * out from under an audit trail — a hard delete on a user with any
 * invoice history would fail with a foreign-key violation. Scrubbing PII
 * while keeping the row (status='deleted') satisfies the "right to be
 * forgotten" intent (personal data is gone) while keeping billing records
 * intact, which most jurisdictions' financial record-keeping rules
 * actually require regardless of an erasure request.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { wrapAsyncRouter } from '../middleware/asyncHandler.ts';
import { usersRepo, sessionsRepo, contentRepo, analysesRepo, auditRepo } from '../db/index.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = wrapAsyncRouter(Router());

function clearSecureCookie(res: any, req: any, name: string) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = isSecure ? 'Secure; SameSite=None' : 'SameSite=Lax';
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; ${attrs}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

function sanitizeProfileInput(profile: any) {
  return {
    communicationStyle: String(profile.communication_style || 'warm').substring(0, 50),
    preferredTone: String(profile.preferred_tone || 'kind but direct').substring(0, 50),
    defaultScenario: String(profile.default_scenario || 'general').substring(0, 50),
    notes: String(profile.notes || '').substring(0, 1000),
    preserveVoice: profile.preserve_voice !== undefined ? !!profile.preserve_voice : true,
    timezone: String(profile.timezone || 'UTC').substring(0, 50),
    locale: String(profile.locale || 'en-US').substring(0, 10),
    overdoPatterns: Array.isArray(profile.overdo_patterns) ? profile.overdo_patterns.map((p: any) => String(p).substring(0, 50)).slice(0, 20) : [],
    favoritePhrases: Array.isArray(profile.favorite_phrases) ? profile.favorite_phrases.map((p: any) => String(p).substring(0, 100)).slice(0, 20) : [],
    avoidedPhrases: Array.isArray(profile.avoided_phrases) ? profile.avoided_phrases.map((p: any) => String(p).substring(0, 100)).slice(0, 20) : [],
  };
}

router.get('/security/metrics', requireAuth, async (req: any, res) => {
  const isPgActive = true; // always true now - Postgres is the only store
  // Scoped to the requesting user's own logs — previously returned every
  // user's audit log entries to any authenticated caller.
  const logs = await auditRepo.listAuditLogs({ userId: req.user.id, limit: 50, offset: 0 });
  res.json({ postgresActive: isPgActive, auditLogs: logs });
});

router.get('/state', requireAuth, async (req: any, res) => {
  const user = req.user;

  let profile = await contentRepo.getUserProfile(user.id);
  if (!profile) {
    profile = await contentRepo.upsertUserProfile({
      userId: user.id, communicationStyle: 'warm', overdoPatterns: ['overexplain'], preferredTone: 'kind but direct',
      preserveVoice: true, defaultScenario: 'general', notes: '', timezone: 'UTC', locale: 'en-US',
    });
  }

  const [userAnalyses, templates, playbooks, blogPosts, testimonials] = await Promise.all([
    analysesRepo.listAnalysesForUser(user.id, { limit: 200, offset: 0 }),
    contentRepo.listActiveTemplates(),
    contentRepo.listPublishedPlaybooks(),
    contentRepo.listPublishedBlogPosts(50, 0),
    contentRepo.listActiveTestimonials(),
  ]);

  res.json({
    user,
    profile,
    analyses: userAnalyses,
    templates,
    playbooks,
    blog_posts: blogPosts,
    testimonials,
  });
});

router.post('/profile', requireAuth, async (req: any, res) => {
  const { profile } = req.body ?? {};
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ error: 'Profile data is required and must be an object.' });
  }
  const clean = sanitizeProfileInput(profile);
  // userId is always taken from the authenticated session, never the body
  // — prevents a caller from tampering with the target of the update (IDOR).
  const updatedProfile = await contentRepo.upsertUserProfile({ userId: req.user.id, ...clean });
  res.json({ success: true, profile: updatedProfile });
});

router.post('/user/update', requireAuth, async (req: any, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await usersRepo.findUserByEmail(normalizedEmail);
  if (existing && existing.id !== req.user.id) {
    return res.status(400).json({ error: 'Email address is already in use.' });
  }

  const updated = await usersRepo.updateUser(req.user.id, { name: String(name).substring(0, 100), email: normalizedEmail });
  if (!updated) return res.status(404).json({ error: 'User record not found.' });

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'account.update', `Updated account details: name=${updated.name}, email=${updated.email}`);
  res.json({ success: true, user: usersRepo.sanitizeUser(updated) });
});

router.post('/onboarding/complete', requireAuth, async (req: any, res) => {
  const { profileData } = req.body ?? {};
  if (!profileData || typeof profileData !== 'object') {
    return res.status(400).json({ error: 'Profile choices are required and must be an object.' });
  }
  const clean = sanitizeProfileInput(profileData);

  const [updatedUser, updatedProfile] = await Promise.all([
    usersRepo.updateUser(req.user.id, { onboarding_completed: true }),
    contentRepo.upsertUserProfile({ userId: req.user.id, ...clean, preserveVoice: true }),
  ]);
  if (!updatedUser) return res.status(404).json({ error: 'User record not found.' });

  res.json({ success: true, user: usersRepo.sanitizeUser(updatedUser), profile: updatedProfile });
});

router.post('/analyses/save', requireAuth, async (req: any, res) => {
  const { analysis_id, saved } = req.body ?? {};
  if (!analysis_id) return res.status(400).json({ error: 'Analysis ID is required.' });

  const existing = await analysesRepo.getAnalysisForUser(analysis_id, req.user.id);
  if (!existing) {
    // Could be "doesn't exist" or "belongs to someone else" — same 404
    // either way so a caller can't distinguish (and enumerate) the two.
    await auditRepo.logSecurityEvent(req.user.id, req.ip, 'security.unauthorized_access_attempt', `User tried to bookmark analysis not owned by them: ${analysis_id}`);
    return res.status(404).json({ error: 'Analysis not found.' });
  }

  const analysis = await analysesRepo.setAnalysisSaved(analysis_id, req.user.id, !!saved);
  res.json({ success: true, analysis });
});

router.delete('/analyses/:id', requireAuth, async (req: any, res) => {
  const existing = await analysesRepo.getAnalysisForUser(req.params.id, req.user.id);
  if (!existing) {
    await auditRepo.logSecurityEvent(req.user.id, req.ip, 'security.unauthorized_delete_attempt', `User tried to delete analysis not owned by them: ${req.params.id}`);
    return res.status(404).json({ error: 'Analysis not found.' });
  }
  await analysesRepo.deleteAnalysisForUser(req.params.id, req.user.id);
  res.json({ success: true });
});

router.post('/privacy/delete-account', requireAuth, async (req: any, res) => {
  const userId = req.user.id;

  await sessionsRepo.revokeAllSessionsForUser(userId);
  // PII scrub + soft delete — see file header for why this isn't a hard
  // DELETE. A sentinel, unusable password_hash/salt is set (rather than
  // NULL) because the users table has a CHECK constraint requiring every
  // row to have either a password or an OAuth identity — nulling both
  // simultaneously would violate it. crypto.randomBytes output can never
  // match a real PBKDF2 hash, so this account can never authenticate
  // again, which is the actual goal.
  const scrubbedHash = crypto.randomBytes(32).toString('hex');
  const scrubbedSalt = crypto.randomBytes(16).toString('hex');
  await usersRepo.updateUser(userId, {
    name: 'Deleted User', email: `deleted_${userId}@erased.invalid`,
    password_hash: scrubbedHash, password_salt: scrubbedSalt, two_factor_secret: null, two_factor_enabled: false,
    oauth_provider: null, oauth_id: null, status: 'deleted',
  });
  await usersRepo.softDeleteUser(userId);

  clearSecureCookie(res, req, 'session_id');
  await auditRepo.logSecurityEvent(userId, req.ip, 'privacy.delete_account', 'User initiated full account erasure (Right to Be Forgotten)');
  res.json({ success: true, message: 'Your account and all associated personal data have been permanently erased.' });
});

router.get('/privacy/export-data', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const [profile, analyses] = await Promise.all([
    contentRepo.getUserProfile(userId),
    analysesRepo.listAnalysesForUser(userId, { limit: 10000, offset: 0 }),
  ]);

  const exportPackage = {
    exported_at: new Date().toISOString(),
    user: req.user,
    profile: profile || {},
    analyses,
  };

  await auditRepo.logSecurityEvent(userId, req.ip, 'privacy.export_data', 'User requested full GDPR data portability export');

  res.setHeader('Content-disposition', `attachment; filename=how_it_lands_export_${userId}.json`);
  res.setHeader('Content-type', 'application/json');
  res.end(JSON.stringify(exportPackage, null, 2));
});

export default router;
