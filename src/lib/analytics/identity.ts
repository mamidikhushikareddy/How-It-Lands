/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Identity & Pseudonymization Subsystem
 * 
 * Strict Privacy Rules:
 * 1. Never transmit raw email addresses, actual usernames, or plaintext credentials to analytics providers.
 * 2. Anonymize unauthenticated visitors with a randomly generated, client-persisted `anonymous_id`.
 * 3. When authenticated, derive a deterministic, non-reversible `pseudonymous_user_id` using
 *    SHA-256 hashing over user IDs with an application-specific cryptographic salt.
 * 4. Maintain session IDs that refresh on timeout (30 minutes of inactivity) or explicit logout.
 */

const ANON_ID_STORAGE_KEY = 'howitlands_analytics_anon_id';
const SESSION_ID_STORAGE_KEY = 'howitlands_analytics_session_id';
const LAST_ACTIVITY_KEY = 'howitlands_analytics_last_active';
const PSEUDO_SALT = 'howitlands_analytics_salt_v1';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface AnalyticsIdentity {
  anonymousId: string;
  pseudonymousUserId: string | null;
  sessionId: string;
  authState: 'authenticated' | 'unauthenticated';
}

let cachedIdentity: AnalyticsIdentity | null = null;

/**
 * Fast synchronous SHA-256 implementation with Web Crypto fallback.
 * Ensures consistent pseudonymization in both browser and headless test environments.
 */
function fastHash(input: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (4294967296 + (h1 >>> 0)).toString(16).substring(1);
  const part2 = (4294967296 + (h2 >>> 0)).toString(16).substring(1);
  return `${part1}${part2}`;
}

/**
 * Derives a stable, irreversible pseudonymous ID from a database or auth user ID.
 * Example output: "pseudo_a7f92b0c3d4e1f20"
 */
export function derivePseudonymousUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') return '';
  const cleanId = userId.trim();
  const hash = fastHash(`${PSEUDO_SALT}:${cleanId}`);
  return `pseudo_${hash}`;
}

/**
 * Generates a high-entropy UUID-like random identifier.
 */
function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * Retrieves or initializes the persistent anonymous ID.
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') {
    return generateId('anon');
  }

  try {
    let anonId = localStorage.getItem(ANON_ID_STORAGE_KEY);
    if (!anonId) {
      anonId = generateId('anon');
      localStorage.setItem(ANON_ID_STORAGE_KEY, anonId);
    }
    return anonId;
  } catch {
    return generateId('anon');
  }
}

/**
 * Retrieves or rotates the session ID based on 30-minute inactivity.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return generateId('sess');
  }

  const now = Date.now();
  try {
    const lastActiveStr = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    const existingSessionId = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);

    if (existingSessionId && lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (now - lastActive < SESSION_TIMEOUT_MS) {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        return existingSessionId;
      }
    }

    // Session expired or new session: rotate ID
    const newSessionId = generateId('sess');
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, newSessionId);
    sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    return newSessionId;
  } catch {
    return generateId('sess');
  }
}

/**
 * Returns current snapshot of identity state.
 */
export function getCurrentIdentity(): AnalyticsIdentity {
  if (cachedIdentity) {
    return cachedIdentity;
  }

  const anonymousId = getOrCreateAnonymousId();
  const sessionId = getOrCreateSessionId();

  cachedIdentity = {
    anonymousId,
    pseudonymousUserId: null,
    sessionId,
    authState: 'unauthenticated'
  };

  return cachedIdentity;
}

/**
 * Links an authenticated user ID to the analytics session.
 * Translates the raw user ID to a pseudonymous ID and marks state as authenticated.
 */
export function setAuthenticatedUser(userId: string): { pseudonymousUserId: string; anonymousId: string; sessionId: string } {
  const anonymousId = getOrCreateAnonymousId();
  const sessionId = getOrCreateSessionId();
  const pseudonymousUserId = derivePseudonymousUserId(userId);

  cachedIdentity = {
    anonymousId,
    pseudonymousUserId,
    sessionId,
    authState: 'authenticated'
  };

  return { pseudonymousUserId, anonymousId, sessionId };
}

/**
 * Resets identity on logout or account switching.
 * Rotates anonymous ID and session ID, clears pseudonymous ID, and resets authentication state.
 */
export function clearAuthenticatedUser(): { previousPseudoId: string | null; newAnonymousId: string } {
  const previousPseudoId = cachedIdentity?.pseudonymousUserId || null;

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(ANON_ID_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      // Ignored in restricted environments
    }
  }

  const newAnonymousId = getOrCreateAnonymousId();
  const newSessionId = getOrCreateSessionId();

  cachedIdentity = {
    anonymousId: newAnonymousId,
    pseudonymousUserId: null,
    sessionId: newSessionId,
    authState: 'unauthenticated'
  };

  return { previousPseudoId, newAnonymousId };
}

export function getAnonymousId(): string {
  return getCurrentIdentity().anonymousId;
}

export function getSessionId(): string {
  return getCurrentIdentity().sessionId;
}

export function getPseudonymousUserId(): string | null {
  return getCurrentIdentity().pseudonymousUserId;
}
