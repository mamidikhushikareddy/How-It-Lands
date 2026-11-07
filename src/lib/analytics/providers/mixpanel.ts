/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mixpanel from 'mixpanel-browser';

/**
 * Mixpanel Provider
 * 
 * Strict Reliability & Privacy:
 * 1. Initializes using official mixpanel-browser SDK.
 * 2. Anonymizes IP collection (ip: false) to protect user location privacy.
 * 3. Never transmits raw emails or passwords; only pseudonymous user IDs.
 * 4. Cleanses state upon logout via mixpanel.reset().
 */

import { getAnalyticsEnv } from '../env';

let isInitialized = false;

export function isMixpanelConfigured(): boolean {
  const token = getAnalyticsEnv('VITE_MIXPANEL_TOKEN');
  return Boolean(token && token.trim());
}

export function initMixpanel(): boolean {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  const token = getAnalyticsEnv('VITE_MIXPANEL_TOKEN')?.trim();
  if (!token) return false;

  try {
    mixpanel.init(token, {
      autotrack: false, // Explicit instrumentation only (no arbitrary clicks/inputs tracked)
      ip: false, // Strict privacy: do not record client IP address
      persistence: 'localStorage',
      ignore_dnt: false, // Honor browser Do-Not-Track headers
      api_host: 'https://api-js.mixpanel.com',
      debug: false
    });
    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('[ANALYTICS:MIXPANEL] Initialization error:', err);
    return false;
  }
}

export function trackMixpanel(eventName: string, properties: Record<string, any>): void {
  if (!isInitialized && !initMixpanel()) return;

  try {
    mixpanel.track(eventName, properties);
  } catch (err) {
    console.warn('[ANALYTICS:MIXPANEL] Track event failed:', err);
  }
}

export function identifyMixpanel(pseudonymousUserId: string, isNewSignup = false): void {
  if (!isInitialized && !initMixpanel()) return;

  try {
    if (isNewSignup) {
      try {
        mixpanel.alias(pseudonymousUserId);
      } catch {
        // Fallback to identify if alias has already been set
        mixpanel.identify(pseudonymousUserId);
      }
    } else {
      mixpanel.identify(pseudonymousUserId);
    }
  } catch (err) {
    console.warn('[ANALYTICS:MIXPANEL] Identify failed:', err);
  }
}

export function resetMixpanel(): void {
  if (!isInitialized) return;

  try {
    mixpanel.reset();
  } catch (err) {
    console.warn('[ANALYTICS:MIXPANEL] Reset failed:', err);
  }
}
