/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PoolClient } from 'pg';
import { pool } from './pool';

/**
 * Runs `fn` inside a single Postgres transaction. Commits on success, rolls
 * back on any thrown error, and always releases the client back to the pool.
 *
 * This is the mechanism that makes multi-step billing operations safe
 * under concurrency — e.g. "insert invoice + update user status + insert
 * processed_webhook_events row" either all happen or none do. The previous
 * implementation had no equivalent: a crash or thrown error partway
 * through a multi-field mutation on the JSON blob could leave a user in a
 * state like "billing_status: active" with no matching invoice.
 *
 * Usage:
 *   await withTransaction(async (client) => {
 *     await client.query('UPDATE users SET ... WHERE id = $1', [id]);
 *     await client.query('INSERT INTO invoices ...', [...]);
 *   });
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[DATABASE] Rollback failed after transaction error', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}
