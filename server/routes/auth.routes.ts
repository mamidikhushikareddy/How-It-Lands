/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Replaces the credential/token auth routes previously inline in server.ts.
 * Three critical fixes applied here that are NOT stylistic — they change
 * actual security behavior:
 *
 * 1. REMOVED: the hardcoded admin-email backdoor in signup
 *    (`role: email === 'admin@howitlands.com' ? 'admin' : 'user'`).
 *    Self-registration can never grant a privileged role. Admin accounts
 *    are provisioned out-of-band (direct DB update by an operator, or a
 *    future dedicated admin-invite flow) — never derived from the email
 *    string a client submits.
 *
 * 2. REMOVED: returning verification codes / reset tokens in the JSON
 *    response body (signup's `verification_code`, resend-verification's
 *    `code`, forgot-password's `token`). These made the entire
 *    email-verification and password-reset security model theater — the
 *    secret reached the requester over the same channel as the request
 *    itself, so email ownership was never actually proven. The secret now
 *    ONLY leaves the server via sendEmailVerificationCode /
 *    sendEmailPasswordReset. In local dev without SMTP configured,
 *    server/email.ts already logs the simulated email to the server
 *    console (not the HTTP response) — that's how you test locally.
 *
 * 3. FIXED: forgot-password and resend-verification no longer return
 *    404 for an email that isn't registered. Both always return the same
 *    generic "if an account exists, we've sent instructions" response,
 *    closing the user-enumeration side channel.
 *
 * Also fixed as part of the repository cutover: password_salt is now a
 * single consistently-named column (see server/db/repositories/users.repo.ts)
 * instead of the `user.salt` vs `password_salt` mismatch that silently
 * corrupted the Postgres shadow copy.
 */

import { Router } from 'express';
import { wrapAsyncRouter } from '../middleware/asyncHandler.ts';
import crypto from 'crypto';
import { isSuperAdminOwner } from '../config/superAdmin.ts';
import { usersRepo, sessionsRepo, tokensRepo, contentRepo, auditRepo, withTransaction } from '../db/index.ts';
import { generateSalt, hashPassword, validatePasswordStrength, parseCookies } from '../auth';
import { sendEmailVerificationCode, sendEmailPasswordReset } from '../email';
import { generateBase32Secret, verifyTOTP, generateTOTPUriAndQR } from '../security';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { notifySecurityAlert, maybeAlertNewDeviceLogin } from '../notifications.ts';

const router = wrapAsyncRouter(Router());

const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setSecureCookie(res: any, req: any, name: string, value: string, maxAge: number) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = isSecure ? 'Secure; SameSite=None' : 'SameSite=Lax';
  res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; ${attrs}; Max-Age=${maxAge}`);
}

function clearSecureCookie(res: any, req: any, name: string) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = isSecure ? 'Secure; SameSite=None' : 'SameSite=Lax';
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; ${attrs}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

/**
 * Pre-auth token store for the "password correct, now prove 2FA" gap.
 * In-memory Map is acceptable here specifically because these entries are
 * short-lived (minutes) and losing one on a restart just means the user
 * re-enters their password — unlike sessions or billing state, this is
 * not data loss. Still won't work across multiple server instances without
 * a shared store (Redis) — flagged as a follow-up once 2FA is cut over
 * in the next slice; login below still issues these for parity with the
 * existing (not-yet-migrated) 2FA verify route in server.ts.
 */
export const preAuthStore = new Map<string, { userId: string; expiresAt: number }>();

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }
  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid input types.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail.length > 100 || !EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: passwordCheck.error });
  }
  if (password.length > 72) {
    return res.status(400).json({ error: 'Password too long. Max limit is 72 characters.' });
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 50) {
    return res.status(400).json({ error: 'Name must be between 1 and 50 characters.' });
  }

  const existing = await usersRepo.findUserByEmail(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const userId = 'u_' + crypto.randomBytes(9).toString('hex');

  const { user, verificationCode } = await withTransaction(async (tx) => {
    const user = await usersRepo.createUser(
      { id: userId, name: trimmedName, email: normalizedEmail, passwordHash, passwordSalt: salt },
      tx
    );
    await contentRepo.upsertUserProfile({ userId: user.id }, tx);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await tokensRepo.createEmailVerificationCode(user.id, verificationCode, 60 * 60, tx);

    return { user, verificationCode };
  });

  sendEmailVerificationCode(user.email, user.name, verificationCode).catch((err) => {
    console.error('[EMAIL SERVICE] Failed to send registration verification code email:', err);
  });

  const token = await sessionsRepo.createSession(user.id, SESSION_MAX_AGE_SECONDS, req.headers['user-agent'] ?? null, req.ip ?? null);
  setSecureCookie(res, req, 'session_id', token, SESSION_MAX_AGE_SECONDS);

  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.signup', `User registered successfully: ${normalizedEmail}`);

  res.status(201).json({ success: true, user: usersRepo.sanitizeUser(user) });
});

/**
 * Elevates the single designated owner account (SUPER_ADMIN_EMAIL) to
 * 'super_admin' the moment its email is confirmed verified — never from
 * a client-submitted role field, only from a server-side match against
 * a fixed, hardcoded owner address plus a verified-email check. This is
 * intentionally narrower than the self-registration admin backdoor that
 * was removed elsewhere in this file: it can't be triggered by anyone
 * signing up with an arbitrary email, only by actually controlling the
 * one specific inbox this deployment is configured to trust.
 */
async function elevateOwnerIfNeeded(user: any) {
  if (!user || !user.email_verified) return user;
  if (user.role === 'super_admin') return user;
  if (!isSuperAdminOwner(user)) return user;
  const updated = await usersRepo.updateUser(user.id, { role: 'super_admin' });
  return updated || user;
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await usersRepo.findUserByEmail(normalizedEmail);

  // Same generic error for "no such user" and "wrong password" — do not
  // let the response shape reveal which one it was (user enumeration).
  const genericError = () => res.status(401).json({ error: 'Invalid email or password.' });

  if (!user || !user.password_hash || !user.password_salt) {
    return genericError();
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({ error: 'Account temporarily locked due to repeated failed login attempts. Try again later.' });
  }

  const verifyHash = hashPassword(password, user.password_salt);
  if (verifyHash !== user.password_hash) {
    const attempts = user.failed_login_attempts + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await usersRepo.recordFailedLogin(user.id, lockUntil);
    await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.login_failed', `Failed login attempt for: ${normalizedEmail}`);
    return genericError();
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
  }

  await usersRepo.resetFailedLogins(user.id);
  const elevatedUser = await elevateOwnerIfNeeded(user);

  if (elevatedUser.two_factor_enabled) {
    const preAuthToken = crypto.randomBytes(24).toString('hex');
    preAuthStore.set(preAuthToken, { userId: elevatedUser.id, expiresAt: Date.now() + 5 * 60 * 1000 });
    await auditRepo.logSecurityEvent(elevatedUser.id, req.ip, 'auth.login_2fa_challenge', `Password verified, awaiting 2FA for: ${normalizedEmail}`);
    return res.json({ success: true, two_factor_required: true, pre_auth_token: preAuthToken });
  }

  maybeAlertNewDeviceLogin(elevatedUser, req.headers['user-agent'] ?? null, req.ip ?? null, false).catch((err) => {
    console.error('[NOTIFICATIONS] new-device check failed:', err);
  });
  const token = await sessionsRepo.createSession(elevatedUser.id, SESSION_MAX_AGE_SECONDS, req.headers['user-agent'] ?? null, req.ip ?? null);
  setSecureCookie(res, req, 'session_id', token, SESSION_MAX_AGE_SECONDS);

  await auditRepo.logSecurityEvent(elevatedUser.id, req.ip, 'auth.login_success', `User logged in successfully: ${normalizedEmail}`);

  res.json({ success: true, user: usersRepo.sanitizeUser(elevatedUser) });
});
router.post('/logout', requireAuth, async (req: any, res) => {
  if (req.sessionToken) {
    await sessionsRepo.revokeSession(req.sessionToken);
  }
  clearSecureCookie(res, req, 'session_id');
  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.logout', 'User logged out');
  res.json({ success: true });
});

router.post('/logout-all-devices', requireAuth, async (req: any, res) => {
  await sessionsRepo.revokeAllSessionsForUser(req.user.id);
  clearSecureCookie(res, req, 'session_id');
  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.logout_all_devices', 'User triggered force-logout of all active sessions');
  res.json({ success: true, message: 'Logged out of all sessions successfully.' });
});

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body ?? {};
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await usersRepo.findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  const ok = await tokensRepo.consumeEmailVerificationCode(user.id, String(code).trim());
  if (!ok) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  const verifiedUser = await usersRepo.updateUser(user.id, { email_verified: true });
  await elevateOwnerIfNeeded(verifiedUser);
  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.email_verified', `Email verified successfully for: ${normalizedEmail}`);
  res.json({ success: true, message: 'Email address verified successfully. Your account is now active!' });
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const normalizedEmail = email.toLowerCase().trim();

  // Always return the same response whether or not the account exists —
  // see file header. The real work happens only if it does.
  const respondGeneric = () => res.json({ success: true, message: 'If an account exists for that email, a verification code has been sent.' });

  const user = await usersRepo.findUserByEmail(normalizedEmail);
  if (!user || user.email_verified) {
    return respondGeneric();
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await tokensRepo.createEmailVerificationCode(user.id, code, 60 * 60);

  sendEmailVerificationCode(user.email, user.name, code).catch((err) => {
    console.error('[EMAIL SERVICE] Failed to send resent verification code email:', err);
  });

  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.verification_code_resent', `Verification code resent for: ${normalizedEmail}`);
  respondGeneric();
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const normalizedEmail = email.toLowerCase().trim();

  const respondGeneric = () => res.json({ success: true, message: 'If an account exists for that email, password reset instructions have been sent.' });

  const user = await usersRepo.findUserByEmail(normalizedEmail);
  if (!user) {
    return respondGeneric();
  }

  const token = await tokensRepo.createPasswordResetToken(user.id, 15 * 60);
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  sendEmailPasswordReset(user.email, user.name, resetLink).catch((err) => {
    console.error('[EMAIL SERVICE] Failed to send password reset email:', err);
  });

  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.forgot_password_request', `Password reset requested for: ${normalizedEmail}`);
  respondGeneric();
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: passwordCheck.error });
  }

  const result = await tokensRepo.consumePasswordResetToken(token);
  if (!result) {
    return res.status(400).json({ error: 'Invalid or expired reset token.' });
  }

  const user = await usersRepo.findUserById(result.userId);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token.' });
  }

  const recentHashes = await usersRepo.getRecentPasswordHashes(user.id, 3);
  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);
  if (recentHashes.includes(newHash) || newHash === user.password_hash) {
    return res.status(400).json({ error: 'You cannot reuse one of your recently used passwords.' });
  }

  await usersRepo.setPassword(user.id, newHash, newSalt, user.password_hash, 3);
  await sessionsRepo.revokeAllSessionsForUser(user.id); // force re-login everywhere after a reset
  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.password_reset_success', `Password reset successfully for: ${user.email}`);

  res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

router.post('/change-password', requireAuth, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: passwordCheck.error });
  }

  const user = await usersRepo.findUserById(req.user.id);
  if (!user || !user.password_hash || !user.password_salt) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const verifyHash = hashPassword(currentPassword, user.password_salt);
  if (verifyHash !== user.password_hash) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const recentHashes = await usersRepo.getRecentPasswordHashes(user.id, 3);
  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);
  if (recentHashes.includes(newHash) || newHash === user.password_hash) {
    return res.status(400).json({ error: 'You cannot reuse one of your recently used passwords.' });
  }

  await usersRepo.setPassword(user.id, newHash, newSalt, user.password_hash, 3);
  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.change_password_success', `Password successfully changed in-session for user: ${user.email}`);
  notifySecurityAlert(user, 'password_changed', { ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null }).catch((err) => {
    console.error('[NOTIFICATIONS] password-change alert failed:', err);
  });

  res.json({ success: true, message: 'Password changed successfully.' });
});

// --- 2FA (TOTP) ---

router.post('/2fa/setup', requireAuth, async (req: any, res) => {
  try {
    const secret = generateBase32Secret();
    const { qrCodeDataUrl, uri } = await generateTOTPUriAndQR(req.user.email, secret);
    await auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.2fa_setup_initiated', 'Initiated 2FA configuration');
    res.json({ success: true, secret, qrCodeDataUrl, uri });
  } catch (error) {
    console.error('Failed to initiate 2FA setup:', error);
    res.status(500).json({ error: 'Failed to initiate 2FA setup.' });
  }
});

router.post('/2fa/verify', requireAuth, async (req: any, res) => {
  const { secret, code } = req.body ?? {};
  if (!secret || !code) {
    return res.status(400).json({ error: 'Secret and verification code are required.' });
  }
  if (!verifyTOTP(secret, code)) {
    return res.status(400).json({ error: 'Invalid verification code. Please scan the QR code and try again.' });
  }

  await usersRepo.updateUser(req.user.id, { two_factor_secret: secret, two_factor_enabled: true });
  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.2fa_enabled', 'Successfully verified and enabled 2FA');
  notifySecurityAlert(req.user, '2fa_enabled', { ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null }).catch((err) => {
    console.error('[NOTIFICATIONS] 2fa-enabled alert failed:', err);
  });
  res.json({ success: true });
});

router.post('/2fa/disable', requireAuth, async (req: any, res) => {
  await usersRepo.updateUser(req.user.id, { two_factor_secret: null, two_factor_enabled: false });
  await auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.2fa_disabled', 'Disabled 2FA authentication');
  notifySecurityAlert(req.user, '2fa_disabled', { ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null }).catch((err) => {
    console.error('[NOTIFICATIONS] 2fa-disabled alert failed:', err);
  });
  res.json({ success: true });
});

router.post('/2fa/login-verify', async (req, res) => {
  const { pre_auth_token, code } = req.body ?? {};
  if (!pre_auth_token || !code) {
    return res.status(400).json({ error: 'Pre-auth token and verification code are required.' });
  }

  const record = preAuthStore.get(pre_auth_token);
  if (!record || Date.now() > record.expiresAt) {
    return res.status(401).json({ error: 'Pre-authentication session expired or is invalid.' });
  }

  const user = await usersRepo.findUserById(record.userId);
  if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
    return res.status(401).json({ error: 'Invalid authentication request.' });
  }

  if (!verifyTOTP(user.two_factor_secret, code)) {
    await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.2fa_login_failed', 'Failed 2FA validation challenge during login');
    return res.status(401).json({ error: 'Invalid verification code.' });
  }

  preAuthStore.delete(pre_auth_token);
  const elevatedUser = await elevateOwnerIfNeeded(user);

  maybeAlertNewDeviceLogin(elevatedUser, req.headers['user-agent'] ?? null, req.ip ?? null, false).catch((err) => {
    console.error('[NOTIFICATIONS] new-device check failed:', err);
  });
  const token = await sessionsRepo.createSession(elevatedUser.id, SESSION_MAX_AGE_SECONDS, req.headers['user-agent'] ?? null, req.ip ?? null);
  setSecureCookie(res, req, 'session_id', token, SESSION_MAX_AGE_SECONDS);

  await auditRepo.logSecurityEvent(elevatedUser.id, req.ip, 'auth.login_2fa', 'Successfully validated 2FA and logged in');
  res.json({ success: true, user: usersRepo.sanitizeUser(elevatedUser) });
});

// --- OAuth ---

/**
 * Google Sign-In via Google Identity Services (not Firebase). The
 * frontend obtains a signed ID token (JWT) directly from Google's GIS
 * library and sends it here as `credential` — this route verifies it
 * cryptographically against Google's public keys before trusting
 * anything in it. The email/name/Google user ID all come from the
 * VERIFIED token payload, never from client-submitted fields.
 *
 * This replaces a real vulnerability: the previous version accepted a
 * raw {provider, email, name, id} object from the request body with no
 * verification at all — anyone could log in as any email address by
 * simply POSTing it here.
 */
router.post('/oauth-callback', async (req, res) => {
  const { credential } = req.body ?? {};
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'Missing Google credential.' });
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('[OAUTH] VITE_GOOGLE_CLIENT_ID is not set — cannot verify Google sign-in.');
    return res.status(500).json({ error: 'Google sign-in is not configured on this server.' });
  }

  let payload;
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (err: any) {
    await auditRepo.logSecurityEvent(undefined, req.ip, 'auth.oauth_verification_failed', `Google ID token verification failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid or expired Google credential.' });
  }

  if (!payload || !payload.email || !payload.sub) {
    return res.status(401).json({ error: 'Google credential did not contain the expected identity fields.' });
  }
  if (!payload.email_verified) {
    return res.status(401).json({ error: 'Your Google account email is not verified.' });
  }

  const normalizedEmail = payload.email.toLowerCase().trim();
  const googleUserId = payload.sub; // stable, unique per Google account — never the email itself
  const name = payload.name || normalizedEmail.split('@')[0];

  let user = await usersRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    const userId = 'u_' + crypto.randomBytes(9).toString('hex');
    user = await withTransaction(async (tx) => {
      const created = await usersRepo.createUser(
        { id: userId, name, email: normalizedEmail, oauthProvider: 'google', oauthId: googleUserId, emailVerified: true },
        tx
      );
      await contentRepo.upsertUserProfile({ userId: created.id }, tx);
      return created;
    });
  } else if (user.oauth_provider === 'google' && user.oauth_id && user.oauth_id !== googleUserId) {
    // This email is already linked to a *different* Google account — refuse rather than silently re-link.
    await auditRepo.logSecurityEvent(user.id, req.ip, 'security.oauth_identity_mismatch', `Google sign-in for ${normalizedEmail} presented a different Google account ID than previously linked.`);
    return res.status(409).json({ error: 'This email is already linked to a different Google account.' });
  } else {
    user = await usersRepo.updateUser(user.id, { oauth_provider: 'google', oauth_id: googleUserId, email_verified: true });
  }

  if (!user) {
    return res.status(500).json({ error: 'Failed to establish OAuth account.' });
  }
  user = await elevateOwnerIfNeeded(user);

  maybeAlertNewDeviceLogin(user, req.headers['user-agent'] ?? null, req.ip ?? null, false).catch((err) => {
    console.error('[NOTIFICATIONS] new-device check failed:', err);
  });
  const token = await sessionsRepo.createSession(user.id, SESSION_MAX_AGE_SECONDS, req.headers['user-agent'] ?? null, req.ip ?? null);
  setSecureCookie(res, req, 'session_id', token, SESSION_MAX_AGE_SECONDS);

  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.oauth_login', `Logged in using verified Google sign-in: ${normalizedEmail}`);
  res.json({ success: true, user: usersRepo.sanitizeUser(user) });
});

router.post('/oauth-link', requireAuth, async (req: any, res) => {
  const { credential } = req.body ?? {};
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'Missing Google credential.' });
  }
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Google sign-in is not configured on this server.' });
  }

  let payload;
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired Google credential.' });
  }
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'Google credential did not contain the expected identity fields.' });
  }

  const user = await usersRepo.updateUser(req.user.id, { oauth_provider: 'google', oauth_id: payload.sub });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.oauth_link', `Successfully linked verified Google account to: ${user.email}`);
  res.json({ success: true, user: usersRepo.sanitizeUser(user) });
});

router.post('/oauth-unlink', requireAuth, async (req: any, res) => {
  const user = await usersRepo.updateUser(req.user.id, { oauth_provider: null, oauth_id: null });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  await auditRepo.logSecurityEvent(user.id, req.ip, 'auth.oauth_unlink', `Successfully unlinked OAuth provider from: ${user.email}`);
  res.json({ success: true, user: usersRepo.sanitizeUser(user) });
});

export default router;
