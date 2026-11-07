/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Product Analytics Orchestrator
 * Unified facade managing GA4, Mixpanel, Amplitude, and Microsoft Clarity.
 * 
 * Production Reliability Principles:
 * 1. Strict Consent Guard: Never fires non-essential tracking without user consent.
 * 2. Deduplication Engine: Detects and suppresses duplicate dispatches within a 1-second debounce window.
 * 3. Runtime Privacy Validator: Rejects sensitive keys, raw emails, tokens, and raw message texts.
 * 4. Fault Tolerance: SDK failures are isolated and never disrupt core application state.
 * 5. Deterministic Pseudonymization: Identity mapping uses salt-hashed user IDs.
 */

import { getConsentStatus, hasConsentFor, onConsentChange, ConsentPreferences } from './consent';
import { getCurrentIdentity, setAuthenticatedUser, clearAuthenticatedUser } from './identity';
import { 
  AnalyticsEventName, 
  AnalyticsEventProperties, 
  BaseEventEnvelope, 
  validateEventPayload, 
  APP_VERSION, 
  PLATFORM 
} from './events';
import { initGA4, trackGA4, identifyGA4, resetGA4, isGA4Configured } from './providers/ga4';
import { initMixpanel, trackMixpanel, identifyMixpanel, resetMixpanel, isMixpanelConfigured } from './providers/mixpanel';
import { initAmplitude, trackAmplitude, identifyAmplitude, resetAmplitude, isAmplitudeConfigured } from './providers/amplitude';
import { initClarity, identifyClarity, isClarityConfigured } from './providers/clarity';

export interface RecordedEventRecord {
  event: AnalyticsEventName;
  eventName: AnalyticsEventName;
  envelope: BaseEventEnvelope;
  properties: Record<string, any>;
  timestamp: number;
}

// In-memory event buffer for local verification and automated testing
const eventLogBuffer: RecordedEventRecord[] = [];
const MAX_LOG_BUFFER_SIZE = 100;

// Deduplication cache: stores event signature -> timestamp
const deduplicationCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 1000; // 1 second duplicate suppression window

let isInitialized = false;

/**
 * Generates an event ID (UUID v4 or cryptographic fallback)
 */
function createEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'evt_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Initializes the analytics subsystem based on user consent and available environment keys.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  const consent = getConsentStatus();

  // Initialize analytics providers if consent has been granted
  if (consent.analytics) {
    if (isGA4Configured()) initGA4();
    if (isMixpanelConfigured()) initMixpanel();
    if (isAmplitudeConfigured()) initAmplitude();
  }

  // Initialize session replay if explicit replay consent is granted
  if (consent.replay && isClarityConfigured()) {
    initClarity();
  }

  // Subscribe to consent changes so providers automatically activate or deactivate
  if (!isInitialized) {
    onConsentChange((newConsent: ConsentPreferences) => {
      if (newConsent.analytics) {
        if (isGA4Configured()) initGA4();
        if (isMixpanelConfigured()) initMixpanel();
        if (isAmplitudeConfigured()) initAmplitude();
      }
      if (newConsent.replay && isClarityConfigured()) {
        initClarity();
      }
    });
    isInitialized = true;
  }
}

/**
 * Tracks a strongly typed, validated event across all enabled analytics providers.
 */
export function track<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventProperties<E>,
  options?: { featureName?: string; experimentVariant?: string }
): boolean {
  // 1. Consent Gate: Do not record non-essential events if user hasn't consented
  if (!hasConsentFor('analytics')) {
    return false;
  }

  // 2. Validate event payload at runtime to prevent leakage of sensitive text or credentials
  const validation = validateEventPayload(eventName, properties);
  if (!validation.isValid) {
    console.warn(`[ANALYTICS] Dropping event "${eventName}" due to validation errors:`, validation.errors);
    return false;
  }

  // 3. Deduplication Check: Prevent identical event bursts from duplicate component renders
  const signature = `${eventName}:${JSON.stringify(validation.sanitizedProperties)}`;
  const now = Date.now();
  const lastFired = deduplicationCache.get(signature);

  if (lastFired && now - lastFired < DEDUPLICATION_WINDOW_MS) {
    return false; // Suppress duplicate dispatch
  }
  deduplicationCache.set(signature, now);

  // Clean old deduplication cache entries
  if (deduplicationCache.size > 50) {
    for (const [key, time] of deduplicationCache.entries()) {
      if (now - time > 5000) deduplicationCache.delete(key);
    }
  }

  // 4. Construct complete event envelope
  const identity = getCurrentIdentity();
  const eventId = createEventId();
  const timestampUtc = new Date().toISOString();

  const envelope: BaseEventEnvelope = {
    event_id: eventId,
    event_timestamp_utc: timestampUtc,
    anonymous_id: identity.anonymousId,
    pseudonymous_user_id: identity.pseudonymousUserId,
    session_id: identity.sessionId,
    feature_name: options?.featureName || (properties as any)?.feature_name || 'core',
    app_version: APP_VERSION,
    platform: PLATFORM,
    authentication_state: identity.authState,
    experiment_variant: options?.experimentVariant
  };

  const consolidatedPayload = {
    ...envelope,
    ...validation.sanitizedProperties
  };

  // 5. Append to in-memory verification buffer
  eventLogBuffer.unshift({
    event: eventName,
    eventName,
    envelope,
    properties: validation.sanitizedProperties,
    timestamp: now
  });
  if (eventLogBuffer.length > MAX_LOG_BUFFER_SIZE) {
    eventLogBuffer.pop();
  }

  // 6. Dispatch to individual active providers in isolated try-catch blocks
  if (isGA4Configured()) {
    try {
      trackGA4(eventName, consolidatedPayload);
    } catch (err) {
      console.warn('[ANALYTICS] GA4 dispatch failed:', err);
    }
  }

  if (isMixpanelConfigured()) {
    try {
      trackMixpanel(eventName, consolidatedPayload);
    } catch (err) {
      console.warn('[ANALYTICS] Mixpanel dispatch failed:', err);
    }
  }

  if (isAmplitudeConfigured()) {
    try {
      trackAmplitude(eventName, consolidatedPayload);
    } catch (err) {
      console.warn('[ANALYTICS] Amplitude dispatch failed:', err);
    }
  }

  return true;
}

/**
 * Identifies the user securely across providers using pseudonymous IDs.
 */
export function identify(userId: string, isNewSignup = false): void {
  const { pseudonymousUserId } = setAuthenticatedUser(userId);

  if (hasConsentFor('analytics')) {
    if (isGA4Configured()) {
      identifyGA4(pseudonymousUserId);
    }
    if (isMixpanelConfigured()) {
      identifyMixpanel(pseudonymousUserId, isNewSignup);
    }
    if (isAmplitudeConfigured()) {
      identifyAmplitude(pseudonymousUserId);
    }
  }

  if (hasConsentFor('replay') && isClarityConfigured()) {
    identifyClarity(pseudonymousUserId);
  }
}

/**
 * Resets user identity across providers on logout or session termination.
 */
export function resetIdentity(): void {
  clearAuthenticatedUser();

  if (isGA4Configured()) {
    resetGA4();
  }
  if (isMixpanelConfigured()) {
    resetMixpanel();
  }
  if (isAmplitudeConfigured()) {
    resetAmplitude();
  }
}

/**
 * Returns recent events recorded in this session (useful for verification and tests).
 */
export function getRecentEvents(): RecordedEventRecord[] {
  return [...eventLogBuffer];
}

/**
 * Clears the in-memory recorded events buffer (useful for test isolation).
 */
export function clearRecentEvents(): void {
  eventLogBuffer.length = 0;
  deduplicationCache.clear();
}

/**
 * Inspects provider health and configuration status.
 */
export function getAnalyticsStatus() {
  const consent = getConsentStatus();
  return {
    isInitialized,
    consent,
    providers: {
      ga4: isGA4Configured(),
      mixpanel: isMixpanelConfigured(),
      amplitude: isAmplitudeConfigured(),
      clarity: isClarityConfigured()
    },
    identity: getCurrentIdentity(),
    eventsLoggedCount: eventLogBuffer.length
  };
}
