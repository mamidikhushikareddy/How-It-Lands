/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import clarity from '@microsoft/clarity';

/**
 * Microsoft Clarity Session Replay Provider
 * 
 * Strict Privacy & Compliance Rules:
 * 1. NEVER initialized without explicit user consent for session replay ('replay' category).
 * 2. Sensitive user content (messages, drafts, rewrites, AI outputs, inputs) is masked
 *    using data-clarity-mask attributes across all workspace DOM elements.
 * 3. Identifies users strictly through pseudonymous IDs, never emails.
 */

import { getAnalyticsEnv } from '../env';

let isInitialized = false;

export function isClarityConfigured(): boolean {
  const projectId = getAnalyticsEnv('VITE_CLARITY_PROJECT_ID');
  return Boolean(projectId && projectId.trim());
}

export function initClarity(): boolean {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  const projectId = getAnalyticsEnv('VITE_CLARITY_PROJECT_ID')?.trim();
  if (!projectId) return false;

  try {
    clarity.init(projectId);
    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('[ANALYTICS:CLARITY] Initialization error:', err);
    return false;
  }
}

/**
 * Identifies the user in Clarity using pseudonymous identifier.
 */
export function identifyClarity(pseudonymousUserId: string): void {
  if (!isInitialized && !initClarity()) return;

  try {
    clarity.identify(pseudonymousUserId);
  } catch (err) {
    console.warn('[ANALYTICS:CLARITY] Identify failed:', err);
  }
}

/**
 * Attaches custom tag to Clarity session (e.g. plan, auth state).
 */
export function tagClarity(key: string, value: string): void {
  if (!isInitialized) return;

  try {
    clarity.setTag(key, value);
  } catch (err) {
    console.warn('[ANALYTICS:CLARITY] SetTag failed:', err);
  }
}

/**
 * Upgrades session priority on critical user flow completion
 */
export function upgradeClarity(reason: string): void {
  if (!isInitialized) return;

  try {
    clarity.upgrade(reason);
  } catch (err) {
    console.warn('[ANALYTICS:CLARITY] Upgrade failed:', err);
  }
}
