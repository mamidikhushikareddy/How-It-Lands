/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Privacy & Consent Management Subsystem
 * Enforces GDPR/CCPA-compliant opt-in and opt-out controls for product analytics and session replay.
 * Non-essential analytics (Mixpanel, GA4, Amplitude) and replay (Clarity) are NEVER initialized
 * until explicit user consent is granted.
 */

export interface ConsentPreferences {
  analytics: boolean; // GA4, Mixpanel, Amplitude
  replay: boolean;    // Microsoft Clarity
  hasResponded: boolean;
  updatedAt?: string;
}

const CONSENT_STORAGE_KEY = 'howitlands_consent_v1';

type ConsentChangeListener = (consent: ConsentPreferences) => void;
const listeners = new Set<ConsentChangeListener>();
let inMemoryConsent: ConsentPreferences | null = null;

/**
 * Retrieves the currently recorded consent preferences from persistent storage.
 * Default is strict opt-in: all non-essential tracking disabled until user decides.
 */
export function getConsentStatus(): ConsentPreferences {
  if (inMemoryConsent) {
    return inMemoryConsent;
  }

  if (typeof window === 'undefined') {
    return { analytics: false, replay: false, hasResponded: false };
  }

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryConsent = {
        analytics: Boolean(parsed.analytics),
        replay: Boolean(parsed.replay),
        hasResponded: Boolean(parsed.hasResponded),
        updatedAt: parsed.updatedAt
      };
      return inMemoryConsent;
    }
  } catch (err) {
    console.warn('[ANALYTICS:CONSENT] Failed to parse stored consent:', err);
  }

  return {
    analytics: false,
    replay: false,
    hasResponded: false
  };
}

/**
 * Updates consent preferences and notifies all registered provider listeners.
 */
export function setConsent(preferences: { analytics: boolean; replay: boolean; functional?: boolean }): ConsentPreferences {
  const updated: ConsentPreferences = {
    analytics: Boolean(preferences.analytics),
    replay: Boolean(preferences.replay),
    hasResponded: true,
    updatedAt: new Date().toISOString()
  };

  inMemoryConsent = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[ANALYTICS:CONSENT] Failed to persist consent preferences:', err);
    }
  }

  // Notify listeners (providers, UI, orchestrator)
  listeners.forEach(fn => {
    try {
      fn(updated);
    } catch (err) {
      console.error('[ANALYTICS:CONSENT] Listener error:', err);
    }
  });

  return updated;
}

/**
 * Opt-in helper: Accept all analytics and replay categories
 */
export function acceptAllConsent(): ConsentPreferences {
  return setConsent({ analytics: true, replay: true });
}

/**
 * Opt-out helper: Reject all non-essential analytics and replay
 */
export function rejectAllConsent(): ConsentPreferences {
  return setConsent({ analytics: false, replay: false });
}

/**
 * Checks whether tracking is permitted for a specific category
 */
export function hasConsentFor(category: 'analytics' | 'replay' | 'functional'): boolean {
  if (category === 'functional') return true;
  const status = getConsentStatus();
  return Boolean(status[category]);
}

/**
 * Subscribe to consent changes (e.g. user updates settings or banner)
 */
export function onConsentChange(listener: ConsentChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConsent(): ConsentPreferences {
  return getConsentStatus();
}

export function resetConsentForTesting(): void {
  inMemoryConsent = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {}
  }
}
