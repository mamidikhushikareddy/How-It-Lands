/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as amplitude from '@amplitude/analytics-browser';

/**
 * Amplitude Analytics Provider
 * 
 * Strict Reliability & Privacy:
 * 1. Uses official @amplitude/analytics-browser SDK.
 * 2. defaultTracking disabled to ensure only verified, sanitized business events are tracked.
 * 3. Identifies users exclusively by pseudonymous identifiers.
 * 4. Calls amplitude.reset() on logout.
 */

import { getAnalyticsEnv } from '../env';

let isInitialized = false;

export function isAmplitudeConfigured(): boolean {
  const apiKey = getAnalyticsEnv('VITE_AMPLITUDE_API_KEY');
  return Boolean(apiKey && apiKey.trim());
}

export function initAmplitude(): boolean {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  const apiKey = getAnalyticsEnv('VITE_AMPLITUDE_API_KEY')?.trim();
  if (!apiKey) return false;

  try {
    amplitude.init(apiKey, undefined, {
      defaultTracking: false, // Explicit business operations only
      serverZone: 'US',
      identityStorage: 'localStorage',
      logLevel: amplitude.Types.LogLevel.Warn
    });
    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('[ANALYTICS:AMPLITUDE] Initialization error:', err);
    return false;
  }
}

export function trackAmplitude(eventName: string, properties: Record<string, any>): void {
  if (!isInitialized && !initAmplitude()) return;

  try {
    amplitude.track(eventName, properties);
  } catch (err) {
    console.warn('[ANALYTICS:AMPLITUDE] Track event failed:', err);
  }
}

export function identifyAmplitude(pseudonymousUserId: string): void {
  if (!isInitialized && !initAmplitude()) return;

  try {
    amplitude.setUserId(pseudonymousUserId);
  } catch (err) {
    console.warn('[ANALYTICS:AMPLITUDE] SetUserId failed:', err);
  }
}

export function resetAmplitude(): void {
  if (!isInitialized) return;

  try {
    amplitude.reset();
  } catch (err) {
    console.warn('[ANALYTICS:AMPLITUDE] Reset failed:', err);
  }
}
