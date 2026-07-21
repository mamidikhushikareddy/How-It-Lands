/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { pool } from '../pool';

const client = (c?: PoolClient) => c ?? pool;

/** Same hashing approach as password reset tokens: never store the raw session token. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

/**
 * Creates a session and returns the raw token (only this function ever
 * sees it — the caller sets it as the cookie value and never stores it
 * itself). Note there is no inline pruning of expired sessions here — that
 * was a scalability bug in the old implementation (a full table
 * scan-and-filter on every login). Expired sessions are simply excluded
 * by lookupSession's WHERE clause; physical cleanup happens via the
 * scheduled `cleanup_expired_auth_records()` function (migration 004).
 */
export async function createSession(
  userId: string,
  expiresInSeconds: number,
  userAgent: string | null,
  ipAddress: string | null,
  c?: PoolClient
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await client(c).query(
    `INSERT INTO sessions (token_hash, user_id, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenHash, userId, userAgent, ipAddress, expiresAt]
  );

  return token;
}

export async function lookupSession(token: string, c?: PoolClient): Promise<SessionRow | null> {
  const tokenHash = hashToken(token);
  const { rows } = await client(c).query<SessionRow>(
    `SELECT id, user_id, expires_at, created_at FROM sessions
     WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function extendSession(token: string, expiresInSeconds: number, c?: PoolClient): Promise<void> {
  const tokenHash = hashToken(token);
  await client(c).query(
    `UPDATE sessions SET expires_at = NOW() + ($2 || ' seconds')::interval WHERE token_hash = $1`,
    [tokenHash, expiresInSeconds]
  );
}

export async function revokeSession(token: string, c?: PoolClient): Promise<void> {
  const tokenHash = hashToken(token);
  await client(c).query(`UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
}

/** "Log out all devices" — revoke every active session for a user. */
export async function revokeAllSessionsForUser(userId: string, c?: PoolClient): Promise<void> {
  await client(c).query(
    `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Used for the "new device sign-in" security alert: a simple, honest
 * heuristic — has this user ever had *any* prior session (revoked or
 * not, expired or not; a past session still tells us this browser has
 * been used before) recorded with this exact user-agent string? Exact
 * match is deliberately conservative: it won't catch a spoofed or
 * slightly-different UA on the same physical device, but it also won't
 * false-positive on browser auto-updates changing the UA string (which
 * a fuzzy/partial match could).
 */
export async function hasPriorSessionFromUserAgent(
  userId: string,
  userAgent: string | null,
  c?: PoolClient
): Promise<boolean> {
  if (!userAgent) return true; // can't fingerprint a missing UA — don't alert on it
  const { rows } = await client(c).query(
    `SELECT 1 FROM sessions WHERE user_id = $1 AND user_agent = $2 LIMIT 1`,
    [userId, userAgent]
  );
  return rows.length > 0;
}
