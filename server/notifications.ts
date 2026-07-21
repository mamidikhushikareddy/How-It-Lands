/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Central wiring for the three "Notification Trigger Settings" toggles
 * in the profile panel (Analysis Reports, Security Alerts, Monthly
 * Reports). Those toggles previously saved a boolean to the database
 * and did nothing else — no code anywhere ever read those columns to
 * actually decide whether to send anything. This module is what
 * reads them and dispatches the real emails, called from the route
 * handlers where each trigger actually happens.
 *
 * Every function here is fire-and-forget from the caller's
 * perspective (the caller does `.catch(...)` and doesn't await) so a
 * slow or failing email never blocks or breaks the actual request —
 * consistent with how sendEmailVerificationCode is already used
 * elsewhere in this codebase.
 */

import { contentRepo, sessionsRepo } from './db/index.ts';
import {
  sendAnalysisReportEmail,
  sendSecurityAlertEmail,
  sendMonthlyReportEmail,
  type SecurityAlertType
} from './email.ts';

interface NotifiableUser {
  id: string;
  email: string;
  name: string;
}

/**
 * "Analysis Reports & Diagnostics Log summaries" — call after a
 * successful analysis is saved.
 */
export async function notifyAnalysisReport(
  user: NotifiableUser,
  analysis: {
    original_message: string;
    output_json: any;
  }
): Promise<void> {
  try {
    const profile = await contentRepo.getUserProfile(user.id);
    if (!profile || profile.email_notifications_enabled === false) return;

    const summary = analysis.output_json?.summary || {};
    await sendAnalysisReportEmail(user.email, user.name, {
      original_message: analysis.original_message,
      landing_status: summary.landing_status,
      overall_read: summary.overall_read,
      recommended_move: summary.recommended_move,
      top_risk: Array.isArray(summary.top_risks) ? summary.top_risks[0] : undefined,
      top_strength: Array.isArray(summary.top_strengths) ? summary.top_strengths[0] : undefined
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] Failed to send analysis report email:', err);
  }
}

/**
 * "Strict Compliance Security Alerts" — call immediately at the
 * moment of the triggering event (new device login, 2FA change,
 * password change). Unlike the other two notification types, this
 * one intentionally does NOT get gated behind a try/catch that
 * swallows silently without logging — security-relevant failures are
 * worth being loud about in the server log even though they still
 * shouldn't break the request.
 */
export async function notifySecurityAlert(
  user: NotifiableUser,
  alertType: SecurityAlertType,
  details: { ipAddress?: string | null; userAgent?: string | null }
): Promise<void> {
  try {
    const profile = await contentRepo.getUserProfile(user.id);
    if (!profile || profile.security_alerts_enabled === false) return;

    await sendSecurityAlertEmail(user.email, user.name, alertType, {
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      timestamp: new Date()
    });
  } catch (err) {
    console.error(`[NOTIFICATIONS] Failed to send security alert (${alertType}):`, err);
  }
}

/**
 * Checks whether this sign-in is from a device/browser this account
 * has never used before, and if so, fires the new_device_login alert.
 * Call this BEFORE creating the new session — the check has to run
 * against session history that doesn't yet include the session about
 * to be created, or it would always find a match against itself and
 * the alert would never fire.
 */
export async function maybeAlertNewDeviceLogin(
  user: NotifiableUser,
  userAgent: string | null,
  ipAddress: string | null,
  isFirstEverSessionForAccount: boolean
): Promise<void> {
  // Never alert on someone's very first session (signup) — there's no
  // "new device" to warn about yet, every device is new at that point.
  if (isFirstEverSessionForAccount) return;

  try {
    const seenBefore = await sessionsRepo.hasPriorSessionFromUserAgent(user.id, userAgent);
    if (seenBefore) return;
    await notifySecurityAlert(user, 'new_device_login', { ipAddress, userAgent });
  } catch (err) {
    console.error('[NOTIFICATIONS] Failed new-device check:', err);
  }
}

/**
 * "Monthly Conversation alignment reports" — called by the scheduled
 * job (see /api/internal/notifications/monthly-report in server.ts),
 * once per eligible user.
 */
export async function notifyMonthlyReport(
  user: NotifiableUser,
  stats: {
    periodLabel: string;
    analysesCount: number;
    avgScore: number | null;
    mostCommonLandingStatus: string | null;
    analysesSavedCount: number;
  }
): Promise<void> {
  try {
    await sendMonthlyReportEmail(user.email, user.name, stats);
  } catch (err) {
    console.error('[NOTIFICATIONS] Failed to send monthly report email:', err);
  }
}
