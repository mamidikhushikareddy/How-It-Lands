/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserProfile } from '../types';

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'howitlands_auth_token',
  SESSION_ID: 'howitlands_session_id',
  USER_ID: 'howitlands_user_id',
  USER_EMAIL: 'howitlands_user_email',
  USER: 'howitlands_auth_user',
  PROFILE: 'howitlands_auth_profile'
};

/**
 * Persists authenticated credentials safely in browser storage.
 */
export function saveAuthSession(
  token?: string | null,
  user?: User | null,
  profile?: UserProfile | null
): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION_ID, token);
    }
    if (user) {
      if (user.id) localStorage.setItem(AUTH_STORAGE_KEYS.USER_ID, user.id);
      if (user.email) localStorage.setItem(AUTH_STORAGE_KEYS.USER_EMAIL, user.email);
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
    }
    if (profile) {
      localStorage.setItem(AUTH_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    }
  } catch (err) {
    console.warn('Failed to persist auth session to localStorage:', err);
  }
}

export function getAuthToken(): string | null {
  try {
    return (
      localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN) ||
      localStorage.getItem(AUTH_STORAGE_KEYS.SESSION_ID) ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('session_id') ||
      null
    );
  } catch {
    return null;
  }
}

export function getAuthUserId(): string | null {
  try {
    return (
      localStorage.getItem(AUTH_STORAGE_KEYS.USER_ID) ||
      localStorage.getItem('auth_user_id') ||
      null
    );
  } catch {
    return null;
  }
}

export function getAuthUserEmail(): string | null {
  try {
    return (
      localStorage.getItem(AUTH_STORAGE_KEYS.USER_EMAIL) ||
      localStorage.getItem('auth_user_email') ||
      null
    );
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_ID);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_ID);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    localStorage.removeItem(AUTH_STORAGE_KEYS.PROFILE);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('auth_user_email');
  } catch (err) {
    console.warn('Failed to clear auth session:', err);
  }
}

/**
 * Build authorized headers containing all redundant session credentials
 */
export function getAuthHeaders(customHeaders: HeadersInit = {}): Record<string, string> {
  const headers: Record<string, string> = {};

  // Extract custom headers
  if (customHeaders instanceof Headers) {
    customHeaders.forEach((val, key) => {
      headers[key] = val;
    });
  } else if (Array.isArray(customHeaders)) {
    customHeaders.forEach(([key, val]) => {
      headers[key] = val;
    });
  } else if (customHeaders && typeof customHeaders === 'object') {
    Object.assign(headers, customHeaders);
  }

  const token = getAuthToken();
  const userId = getAuthUserId();
  const userEmail = getAuthUserEmail();

  if (token) {
    if (!headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!headers['X-Session-ID'] && !headers['x-session-id']) {
      headers['X-Session-ID'] = token;
    }
  }

  if (userId && !headers['X-User-ID'] && !headers['x-user-id']) {
    headers['X-User-ID'] = userId;
  }

  if (userEmail && !headers['X-User-Email'] && !headers['x-user-email']) {
    headers['X-User-Email'] = userEmail;
  }

  return headers;
}

// Capture the pristine native fetch implementation before any code runs
const nativeFetch: typeof fetch = (
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : globalThis.fetch
);

/**
 * Universal authorized fetch helper.
 * Always ensures credentials: 'include', dual-transport headers, and updates local session tokens.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const mergedHeaders = getAuthHeaders(init.headers);

  // Default JSON content-type if not already specified and not FormData
  if (
    !(init.body instanceof FormData) &&
    !mergedHeaders['Content-Type'] &&
    !mergedHeaders['content-type']
  ) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  const updatedInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers: mergedHeaders,
  };

  const response = await nativeFetch(input, updatedInit);

  // Check for session refresh headers
  const newSessionHeader = response.headers.get('x-new-session-id');
  if (newSessionHeader) {
    saveAuthSession(newSessionHeader);
  }

  // Clone response to inspect successful auth returns
  if (response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      response.clone().json().then((data) => {
        if (data && typeof data === 'object') {
          const token = data.token || data.sessionId;
          const user = data.user;
          const profile = data.profile;
          if (token || user) {
            saveAuthSession(token, user, profile);
          }
        }
      }).catch(() => {
        // Ignore clone parse errors
      });
    }
  }

  return response;
}

/**
 * Safe no-op retained for backwards compatibility.
 * Global window.fetch is intentionally preserved unmodified so third-party SDKs
 * (Firebase Auth, Google OAuth) function without prototype mutation errors or recursion.
 */
export function installAuthFetchInterceptor(): void {
  // Intentionally no-op to protect global window.fetch integrity
}
