/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { pool } from '../pool';

const client = (c?: PoolClient) => c ?? pool;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// --- Password reset ---

export async function createPasswordResetToken(
  userId: string,
  expiresInSeconds: number,
  c?: PoolClient
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await client(c).query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' seconds')::interval)`,
    [userId, hashToken(token), expiresInSeconds]
  );
  return token;
}

export async function consumePasswordResetToken(
  token: string,
  c?: PoolClient
): Promise<{ userId: string } | null> {
  const conn = client(c);
  const tokenHash = hashToken(token);

  // Single UPDATE ... RETURNING marks the token used AND validates it in one
  // atomic step, instead of "SELECT to check, then DELETE" (old approach),
  // which has a window where the same token could be consumed twice by
  // concurrent requests.
  const { rows } = await conn.query<{ user_id: string }>(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL
     RETURNING user_id`,
    [tokenHash]
  );
  return rows[0] ? { userId: rows[0].user_id } : null;
}

// --- Email verification ---

export async function createEmailVerificationCode(
  userId: string,
  code: string,
  expiresInSeconds: number,
  c?: PoolClient
): Promise<void> {
  await client(c).query(
    `INSERT INTO email_verification_tokens (user_id, code_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' seconds')::interval)`,
    [userId, hashToken(code), expiresInSeconds]
  );
}

export async function consumeEmailVerificationCode(
  userId: string,
  code: string,
  c?: PoolClient
): Promise<boolean> {
  const { rows } = await client(c).query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND code_hash = $2 AND expires_at > NOW() AND used_at IS NULL
     RETURNING id`,
    [userId, hashToken(code)]
  );
  return rows.length > 0;
}
