/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Global application configuration and constants.
 */
export const CONFIG = {
  appName: 'How It Lands',
  version: '2.0.0',
  apiPrefix: '/api',
  endpoints: {
    state: '/api/state',
    onboarding: '/api/onboarding/complete',
    billingUpgrade: '/api/billing/upgrade',
    analyze: '/api/analyze',
    saveAnalysis: '/api/analyses/save',
    deleteAnalysis: (id: string) => `/api/analyses/${id}`,
    adminContent: '/api/admin/content',
    securityMetrics: '/api/security/metrics',
    mfaSetup: '/api/auth/2fa/setup',
    mfaVerify: '/api/auth/2fa/verify',
    mfaDisable: '/api/auth/2fa/disable',
    mfaLoginVerify: '/api/auth/2fa/login-verify',
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    logout: '/api/auth/logout',
  },
  limits: {
    freeAnalysesLimit: 3,
  },
  featureFlags: {
    enableMfa: true,
    enableEnterpriseSecurity: true,
    enableAdminTerminal: true,
  }
};

/**
 * The single designated owner account. Only this account can add new
 * admins or remove admin status from other accounts — enforced for real
 * server-side in server/config/superAdmin.ts; this copy is for
 * frontend display/UI-gating only (e.g. hiding controls the backend
 * would reject anyway) and is never itself a security boundary.
 */
export const SUPER_ADMIN_EMAIL = 'kiaria2514@gmail.com';

export const ADMIN_TIER_ROLES = new Set(['admin', 'super_admin']);

export function isAdminTier(role: string | undefined | null): boolean {
  return !!role && ADMIN_TIER_ROLES.has(role);
}

export function isSuperAdminOwner(email: string | undefined | null): boolean {
  return !!email && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}
