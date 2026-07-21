/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PoolClient } from 'pg';
import { pool } from '../pool';

/**
 * Row shape as it comes back from Postgres. Deliberately does NOT include
 * `invoices` or `credit_history` — those are normalized into their own
 * tables now (see billing.repo.ts). Callers that need them fetch them
 * explicitly, which makes the cost of that fetch visible at the call site
 * instead of every user lookup silently dragging their whole invoice
 * history along.
 */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  password_salt: string | null;
  plan: 'free' | 'plus' | 'pro' | 'teams' | 'enterprise';
  role: 'user' | 'admin' | 'super_admin' | 'moderator' | 'editor' | 'guest';
  status: 'active' | 'suspended' | 'deleted';
  onboarding_completed: boolean;
  usage_count_month: number;
  usage_period_reset_at: Date;
  billing_customer_id: string | null;
  billing_status: string | null;
  billing_cycle: 'monthly' | 'annual' | null;
  billing_paused: boolean;
  billing_canceled: boolean;
  trial_active: boolean;
  trial_expires_at: Date | null;
  trial_duration_days: number | null;
  credit_balance: number;
  two_factor_secret: string | null;
  two_factor_enabled: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/** Fields safe to send to the client. Never spread a raw UserRow into a response. */
export function sanitizeUser(user: UserRow) {
  const { password_hash, password_salt, two_factor_secret, deleted_at, ...safe } = user;
  return safe;
}

const client = (c?: PoolClient) => c ?? pool;

export async function findUserById(id: string, c?: PoolClient): Promise<UserRow | null> {
  const { rows } = await client(c).query<UserRow>(
    `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

/** CITEXT column handles case-insensitivity — no need for LOWER() gymnastics here. */
export async function findUserByEmail(email: string, c?: PoolClient): Promise<UserRow | null> {
  const { rows } = await client(c).query<UserRow>(
    `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserByOAuth(provider: string, oauthId: string, c?: PoolClient): Promise<UserRow | null> {
  const { rows } = await client(c).query<UserRow>(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2 AND deleted_at IS NULL`,
    [provider, oauthId]
  );
  return rows[0] ?? null;
}

export async function findUserByBillingCustomerId(customerId: string, c?: PoolClient): Promise<UserRow | null> {
  const { rows } = await client(c).query<UserRow>(
    `SELECT * FROM users WHERE billing_customer_id = $1 AND deleted_at IS NULL`,
    [customerId]
  );
  return rows[0] ?? null;
}

export interface CreateUserInput {
  id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  passwordSalt?: string | null;
  oauthProvider?: string | null;
  oauthId?: string | null;
  emailVerified?: boolean;
}

export async function createUser(input: CreateUserInput, c?: PoolClient): Promise<UserRow> {
  const { rows } = await client(c).query<UserRow>(
    `INSERT INTO users (id, name, email, password_hash, password_salt, oauth_provider, oauth_id, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.id,
      input.name,
      input.email,
      input.passwordHash ?? null,
      input.passwordSalt ?? null,
      input.oauthProvider ?? null,
      input.oauthId ?? null,
      input.emailVerified ?? false,
    ]
  );
  return rows[0];
}

/**
 * Generic partial update. Only columns present in `fields` are touched —
 * this is the direct replacement for `user.someField = x; saveDB()`, but
 * as a single atomic UPDATE instead of "rewrite the entire JSON file."
 *
 * Deliberately whitelisted rather than accepting an arbitrary object, so a
 * bug elsewhere in the app can never accidentally write to `role` or
 * `id` through a code path that only meant to update `name`.
 */
const UPDATABLE_FIELDS = [
  'name', 'email', 'password_hash', 'password_salt', 'plan', 'role', 'status',
  'onboarding_completed', 'usage_count_month', 'usage_period_reset_at',
  'billing_customer_id', 'billing_status', 'billing_cycle', 'billing_paused',
  'billing_canceled', 'trial_active', 'trial_expires_at', 'trial_duration_days',
  'two_factor_secret', 'two_factor_enabled', 'email_verified',
  'failed_login_attempts', 'locked_until', 'oauth_provider', 'oauth_id',
] as const;
type UpdatableField = typeof UPDATABLE_FIELDS[number];

export async function updateUser(
  id: string,
  fields: Partial<Record<UpdatableField, unknown>>,
  c?: PoolClient
): Promise<UserRow | null> {
  const keys = Object.keys(fields).filter((k): k is UpdatableField =>
    (UPDATABLE_FIELDS as readonly string[]).includes(k)
  );
  if (keys.length === 0) {
    return findUserById(id, c);
  }

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => fields[k]);

  const { rows } = await client(c).query<UserRow>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...values]
  );
  return rows[0] ?? null;
}

/**
 * Atomic increment — use this instead of read-modify-write
 * (`user.usage_count_month += 1; saveDB()`) for any counter touched by
 * concurrent requests. A read-modify-write in application code loses
 * increments under concurrency; `col = col + $1` never does, because the
 * arithmetic happens inside the database's own row lock.
 */
export async function incrementUsageCount(id: string, by: number, c?: PoolClient): Promise<UserRow | null> {
  const { rows } = await client(c).query<UserRow>(
    `UPDATE users SET usage_count_month = usage_count_month + $2
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, by]
  );
  return rows[0] ?? null;
}

export async function recordFailedLogin(id: string, lockUntil: Date | null, c?: PoolClient): Promise<void> {
  await client(c).query(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = $2 WHERE id = $1`,
    [id, lockUntil]
  );
}

export async function resetFailedLogins(id: string, c?: PoolClient): Promise<void> {
  await client(c).query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [id]
  );
}

/** Password history check — replaces the recent_passwords TEXT[] array on the user row. */
export async function getRecentPasswordHashes(userId: string, limit = 3, c?: PoolClient): Promise<string[]> {
  const { rows } = await client(c).query<{ password_hash: string }>(
    `SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => r.password_hash);
}

/**
 * Sets a new password and records the old one in history, trimming to the
 * last N. Single transaction so a crash can't leave the user with a new
 * password_hash but no history entry (or vice versa).
 */
export async function setPassword(
  userId: string,
  newHash: string,
  newSalt: string,
  previousHash: string | null,
  historyLimit = 3,
  c?: PoolClient
): Promise<void> {
  const conn = client(c);
  await conn.query(
    `UPDATE users SET password_hash = $2, password_salt = $3, failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [userId, newHash, newSalt]
  );
  if (previousHash) {
    await conn.query(
      `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
      [userId, previousHash]
    );
    await conn.query(
      `DELETE FROM password_history WHERE id IN (
         SELECT id FROM password_history WHERE user_id = $1
         ORDER BY created_at DESC OFFSET $2
       )`,
      [userId, historyLimit]
    );
  }
}

export async function softDeleteUser(id: string, c?: PoolClient): Promise<void> {
  await client(c).query(
    `UPDATE users SET status = 'deleted', deleted_at = NOW() WHERE id = $1`,
    [id]
  );
}

export interface ListUsersOptions {
  limit: number;
  offset: number;
  search?: string;
  role?: string;
  status?: string;
}

/** Used by the admin panel. Always paginated — never SELECT * with no LIMIT on a users table. */
export async function listUsers(opts: ListUsersOptions, c?: PoolClient): Promise<{ users: UserRow[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (opts.search) {
    params.push(`%${opts.search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (opts.role) {
    params.push(opts.role);
    conditions.push(`role = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const conn = client(c);

  const [{ rows }, countResult] = await Promise.all([
    conn.query<UserRow>(
      `SELECT * FROM users WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, opts.offset]
    ),
    conn.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE ${where}`, params),
  ]);

  return { users: rows, total: Number(countResult.rows[0].count) };
}

export async function getRolePermissions(role: string, c?: PoolClient): Promise<string[]> {
  const { rows } = await client(c).query<{ permissions: string[] }>(
    `SELECT permissions FROM role_permissions WHERE role = $1`,
    [role]
  );
  return rows[0]?.permissions ?? [];
}
