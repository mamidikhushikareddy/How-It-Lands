/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Single Postgres connection pool for the process.
 *
 * Why this file exists as its own module (not inlined in the old db.ts):
 * every other repository imports `pool` from here. There is exactly one
 * pool per process — repositories never create their own `new Pool(...)`,
 * because each additional pool is a separate set of connections against
 * the database's connection limit.
 *
 * Fails closed: if DATABASE_URL is missing, this throws at startup instead
 * of silently falling back to a local JSON file. A production app that
 * can silently downgrade to storing data on local disk is an app that WILL,
 * eventually, lose customer data when a deploy replaces that disk.
 */

import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    '[DATABASE] DATABASE_URL is not set. Refusing to start without a database — ' +
    'this application does not support running against local file storage in production. ' +
    'Set DATABASE_URL to your Postgres connection string (use the pooled connection string ' +
    'if your provider offers one, e.g. Neon\'s "-pooler" endpoint).'
  );
}

// max: keep this well under your Postgres provider's connection limit,
// divided by the number of server instances you expect to run concurrently.
// e.g. Neon free tier caps around 100 connections; if you run 4 instances,
// 20 per instance leaves headroom for migrations/admin tooling.
export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  // Fired for errors on idle clients in the pool (e.g. network blip).
  // Must be handled or an unhandled 'error' event crashes the whole process.
  console.error('[DATABASE] Unexpected error on idle client', err);
});

/**
 * Liveness/readiness check for the /health endpoint. Cheap query, short
 * timeout — this is called by your infra's health check, potentially
 * frequently, so it must never be the thing that causes load.
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { healthy: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
