/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { loadDB, saveDB } from './db';
import { User } from '../src/types';

export interface UserSession {
  id: string; // Session ID (cryptographically secure)
  user_id: string;
  expires_at: string; // ISO string
  created_at: string;
}

/**
 * Generates a high-entropy secure random salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hashes a password securely using PBKDF2 with SHA-512
 */
export function hashPassword(password: string, salt: string): string {
  // Use PBKDF2 with 10,000 iterations, 64-byte key width
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Validates password strength for production standards
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character.' };
  }
  return { isValid: true };
}

/**
 * Creates a new cryptographically secure session
 */
export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const currentDb = loadDB() as any;
  
  if (!currentDb.sessions) {
    currentDb.sessions = [];
  }

  // Active Session Pruning (Self-Cleaning Cache Pattern) to prevent database bloat
  const now = new Date();
  currentDb.sessions = currentDb.sessions.filter((s: any) => new Date(s.expires_at) > now);

  // Sessions expire in 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const newSession: UserSession = {
    id: token,
    user_id: userId,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  currentDb.sessions.push(newSession);
  saveDB();

  return token;
}

/**
 * Parses raw cookies from Request header
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    if (name) {
      cookies[name] = parts.slice(1).join('=').trim();
    }
  });

  return cookies;
}
