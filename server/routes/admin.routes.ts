/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin routes rewritten against the repository layer. Two data-exposure
 * bugs fixed here, not just the storage backend:
 *
 * - PUT /api/admin/users/:id returned the raw user row including
 *   password_hash and salt in the response body. Every admin action on a
 *   user leaked that user's password hash to the admin's browser network
 *   tab. Now uses usersRepo.sanitizeUser like every other user-returning
 *   route.
 * - POST /api/admin/content returned `{ db: currentDb }` — the entire
 *   database, including every user's password hash and salt — on every
 *   single content edit (even editing a blog post). This was arguably
 *   the single largest exposure surface in the app: any admin session,
 *   or anything that could trick an admin into hitting this endpoint
 *   (e.g. CSRF, given there's no CSRF token on this route either) got
 *   every credential in the system. Removed entirely; responses now
 *   return only the affected resource.
 * - Role assignment now blocks a plain 'admin' from granting 'admin' or
 *   'super_admin' — only a 'super_admin' can grant admin-tier roles. The
 *   original allowed any admin to promote anyone (including themselves,
 *   via /api/admin/content's user.save path) to super_admin.
 * - Admin-tier management (granting admin/super_admin, revoking an
 *   existing admin's admin-tier role, or deleting an admin-tier account)
 *   is further restricted to the single designated owner account
 *   (SUPER_ADMIN_EMAIL, see ../config/superAdmin.ts) — not just anyone
 *   holding the 'super_admin' role. Without this, any super_admin could
 *   remove another admin (including the owner), which is exactly the
 *   scenario a single-owner-controlled admin roster is meant to prevent.
 */

import { Router } from 'express';
import { wrapAsyncRouter } from '../middleware/asyncHandler.ts';
import crypto from 'crypto';
import { usersRepo, sessionsRepo, contentRepo, analysesRepo, auditRepo } from '../db/index.ts';
import { requireAdmin } from '../middleware/auth.middleware.ts';
import { generateSalt, hashPassword } from '../auth';
import { isSuperAdminOwner } from '../config/superAdmin.ts';

const router = wrapAsyncRouter(Router());

const ADMIN_TIER_ROLES = new Set(['admin', 'super_admin']);

router.get('/users', requireAdmin, async (req: any, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const { users, total } = await usersRepo.listUsers({
    limit, offset: (page - 1) * limit,
    search: req.query.search as string | undefined,
    role: req.query.role as string | undefined,
    status: req.query.status as string | undefined,
  });

  const formatted = await Promise.all(users.map(async (u) => {
    const profile = await contentRepo.getUserProfile(u.id);
    return { ...usersRepo.sanitizeUser(u), profile, active_sessions_count: null };
  }));

  res.json({ success: true, users: formatted, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.post('/users', requireAdmin, async (req: any, res) => {
  const { name, email, plan, role, password } = req.body ?? {};
  if (!email) return res.status(400).json({ error: 'Email is required to create a user.' });

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await usersRepo.findUserByEmail(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'An account with this email address already exists.' });

  const assignedRole = role || 'user';
  if (ADMIN_TIER_ROLES.has(assignedRole) && !isSuperAdminOwner(req.user)) {
    await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.privilege_escalation_blocked', `Non-owner attempted to create a user with role "${assignedRole}"`);
    return res.status(403).json({ error: 'Only the designated super-admin owner account can create admin-tier accounts.' });
  }

  const salt = generateSalt();
  const tempPassword = password || ('Temp_' + crypto.randomBytes(6).toString('hex') + '!');
  const userId = 'u_' + crypto.randomBytes(9).toString('hex');

  const created = await usersRepo.createUser({
    id: userId, name: name || 'New User', email: normalizedEmail,
    passwordHash: hashPassword(tempPassword, salt), passwordSalt: salt, emailVerified: true,
  });
  const finalUpdates: Record<string, unknown> = { onboarding_completed: true };
  if (plan && plan !== 'free') {
    finalUpdates.plan = plan;
    finalUpdates.billing_status = 'active';
  }
  if (assignedRole !== 'user') {
    finalUpdates.role = assignedRole;
  }
  const finalUser = await usersRepo.updateUser(userId, finalUpdates);
  await contentRepo.upsertUserProfile({ userId });

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.user_created', `Created new user account: ${normalizedEmail}`);
  res.status(201).json({ success: true, user: usersRepo.sanitizeUser(finalUser!), temp_password: password ? undefined : tempPassword });
});

router.put('/users/:id', requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { role, plan, status, resetPassword } = req.body ?? {};

  const target = await usersRepo.findUserById(id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  const updates: Record<string, unknown> = {};

  if (role) {
    const allowedRoles = ['super_admin', 'admin', 'moderator', 'editor', 'user', 'guest'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role assigned.' });

    const isGrantingAdminTier = ADMIN_TIER_ROLES.has(role);
    const isRevokingAdminTier = ADMIN_TIER_ROLES.has(target.role) && !ADMIN_TIER_ROLES.has(role);

    if ((isGrantingAdminTier || isRevokingAdminTier) && !isSuperAdminOwner(req.user)) {
      await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.privilege_escalation_blocked', `Non-owner attempted to change admin-tier role of ${target.email} to "${role}"`);
      return res.status(403).json({ error: 'Only the designated super-admin owner account can add or remove admins.' });
    }
    updates.role = role;
  }
  if (plan) {
    if (!['free', 'plus', 'pro', 'teams', 'enterprise'].includes(plan)) return res.status(400).json({ error: 'Invalid plan assigned.' });
    updates.plan = plan;
  }
  if (status) {
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status assigned.' });
    updates.status = status;
  }

  if (resetPassword) {
    const tempPassword = 'Temp_' + crypto.randomBytes(6).toString('hex') + '!';
    const newSalt = generateSalt();
    updates.password_hash = hashPassword(tempPassword, newSalt);
    updates.password_salt = newSalt;
    updates.failed_login_attempts = 0;
    updates.locked_until = null;

    await usersRepo.updateUser(id, updates);
    await sessionsRepo.revokeAllSessionsForUser(id);
    await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.user_password_forced_reset', `Forced security reset for user: ${target.email}`);
    // Admin-initiated reset, not self-service — the admin needs this value
    // to relay it to the user out-of-band. Distinct from forgot-password,
    // which must never do this (see auth.routes.ts).
    return res.json({ success: true, message: 'Password has been forced to reset.', temp_password: tempPassword });
  }

  if (status === 'suspended') {
    await sessionsRepo.revokeAllSessionsForUser(id);
  }

  const updated = await usersRepo.updateUser(id, updates);
  if (role) await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.user_role_changed', `Changed role of user ${target.email} to ${role}`);
  if (plan) await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.user_plan_changed', `Changed plan of user ${target.email} to ${plan}`);
  if (status) await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.user_status_changed', `Changed status of user ${target.email} to ${status}`);

  res.json({ success: true, user: usersRepo.sanitizeUser(updated!) });
});

router.delete('/users/:id', requireAdmin, async (req: any, res) => {
  const target = await usersRepo.findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (ADMIN_TIER_ROLES.has(target.role) && !isSuperAdminOwner(req.user)) {
    await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.privilege_escalation_blocked', `Non-owner attempted to delete admin-tier account ${target.email}`);
    return res.status(403).json({ error: 'Only the designated super-admin owner account can remove an admin.' });
  }

  // Soft delete: financial records (invoices) reference this user with
  // ON DELETE RESTRICT — a hard delete on any user with billing history
  // would fail outright. Analyses are removed since they carry no
  // retention requirement.
  await sessionsRepo.revokeAllSessionsForUser(target.id);
  await usersRepo.softDeleteUser(target.id);

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.user_deleted', `Deleted user account ${target.email}.`);
  res.json({ success: true });
});

router.get('/users/:id/audit-logs', requireAdmin, async (req: any, res) => {
  const target = await usersRepo.findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  const logs = await auditRepo.listAuditLogs({ userId: req.params.id, limit: 200, offset: 0 });
  res.json({ success: true, logs });
});

router.get('/audit-logs', requireAdmin, async (req, res) => {
  const logs = await auditRepo.listAuditLogs({ limit: 200, offset: 0 });
  res.json({ success: true, logs });
});

router.post('/content', requireAdmin, async (req: any, res) => {
  const { type, action, item } = req.body ?? {};
  if (!type || !action || !item) {
    return res.status(400).json({ error: 'Incomplete content structure.' });
  }

  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'admin.content_modified', `Admin ${action}ed content of type: ${type} id: ${item.id}`);

  let result: unknown = null;

  if (type === 'template') {
    result = action === 'delete' ? await contentRepo.deleteTemplate(item.id) : await contentRepo.upsertTemplate(item);
  } else if (type === 'playbook') {
    result = action === 'delete' ? await contentRepo.deletePlaybook(item.id) : await contentRepo.upsertPlaybook(item);
  } else if (type === 'blog') {
    result = action === 'delete' ? await contentRepo.deleteBlogPost(item.id) : await contentRepo.upsertBlogPost(item);
  } else if (type === 'testimonial') {
    result = action === 'delete' ? await contentRepo.deleteTestimonial(item.id) : await contentRepo.upsertTestimonial(item);
  } else {
    return res.status(400).json({ error: `Unsupported content type: ${type}` });
  }

  // Only the affected resource is returned — never the whole database
  // (see file header for why the old `{ db: currentDb }` response was a
  // critical credential-exposure bug).
  res.json({ success: true, result });
});

export default router;
