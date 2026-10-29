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
