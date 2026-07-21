/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migration runner. Applies every .sql file in /migrations, in filename
 * order, that hasn't already been applied — tracked in a
 * schema_migrations table so this is safe to run on every deploy, not
 * just once by hand. This is the difference between "someone manually ran
 * 9 psql commands and hopefully didn't skip one" and an actual repeatable
 * deploy step.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate.ts
 *
 * Each migration file already wraps its own BEGIN/COMMIT (see the
 * comments in migrations/001_core_identity.sql for why: migrations are
 * never edited after they've run anywhere, only added to). This runner
 * does not add a second transaction layer around that — it runs each
 * file's SQL as-is and only records success afterward, so a file's own
 * transaction remains the unit of atomicity for that migration.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool, closePool } from '../server/db/pool.ts';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

async function ensureTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>(`SELECT filename FROM schema_migrations`);
  return new Set(rows.map((r) => r.filename));
}

async function main() {
  console.log(`[MIGRATE] Connecting to database...`);
  await pool.query('SELECT 1'); // fail fast with a clear error if DATABASE_URL is wrong

  await ensureTrackingTable();
  const applied = await getAppliedMigrations();

  const allFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // filenames are zero-padded numeric prefixes (001_, 002_, ...) so lexical sort == intended order

  const pending = allFiles.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`[MIGRATE] Database is up to date. ${allFiles.length} migration(s) already applied, nothing to do.`);
    await closePool();
    return;
  }

  console.log(`[MIGRATE] ${pending.length} pending migration(s): ${pending.join(', ')}`);

  for (const filename of pending) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`[MIGRATE] Applying ${filename}...`);

    try {
      // Sent via the simple query protocol (no parameters), which
      // supports the multiple ;-separated statements each migration file
      // contains, including its own BEGIN/COMMIT.
      await pool.query(sql);
      await pool.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [filename]);
      console.log(`[MIGRATE] ✓ ${filename}`);
    } catch (err: any) {
      console.error(`[MIGRATE] ✗ ${filename} FAILED: ${err.message}`);
      console.error(`[MIGRATE] Stopping — fix the error above before retrying. Migrations already applied and recorded before this one are unaffected; this one and any after it were not applied.`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[MIGRATE] Done. ${pending.length} migration(s) applied.`);
  await closePool();
}

main().catch(async (err) => {
  console.error('[MIGRATE] Unexpected error:', err);
  await closePool();
  process.exit(1);
});
