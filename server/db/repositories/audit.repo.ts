/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PoolClient } from 'pg';
import { pool } from '../pool';

const client = (c?: PoolClient) => c ?? pool;

export async function logSecurityEvent(
  userId: string | undefined,
  ipAddress: string | undefined,
  event: string,
  details: string,
  metadata: Record<string, unknown> = {},
  c?: PoolClient
): Promise<void> {
  try {
    await client(c).query(
      `INSERT INTO audit_logs (user_id, ip_address, event, details, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId ?? null, ipAddress ?? null, event, details, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Audit logging must never take down the request it's observing.
    // A failed audit write is itself worth alerting on via your error
    // tracker (Sentry/etc.) — logged to stderr here as the floor, wire in
    // your real error tracker's capture call at this line.
    console.error('[AUDIT] Failed to write security event', { event, err });
  }
}

export async function listAuditLogsByEventPrefixes(prefixes: string[], limit: number, c?: PoolClient) {
  const conditions = prefixes.map((_, i) => `event LIKE $${i + 1}`).join(' OR ');
  const params = prefixes.map((p) => `${p}%`);
  const { rows } = await client(c).query(
    `SELECT * FROM audit_logs WHERE ${conditions} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
    [...params, limit]
  );
  return rows;
}

export interface ListAuditLogsOptions {
  userId?: string;
  event?: string;
  limit: number;
  offset: number;
}

export async function listAuditLogs(opts: ListAuditLogsOptions, c?: PoolClient) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.userId) {
    params.push(opts.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (opts.event) {
    params.push(opts.event);
    conditions.push(`event = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await client(c).query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, opts.limit, opts.offset]
  );
  return rows;
}
