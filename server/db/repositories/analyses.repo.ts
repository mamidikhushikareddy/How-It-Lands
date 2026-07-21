/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PoolClient } from 'pg';
import { pool } from '../pool';

const client = (c?: PoolClient) => c ?? pool;

export interface CreateAnalysisInput {
  id: string;
  userId: string;
  title?: string;
  originalMessage: string;
  scenario?: string;
  relationshipContext?: string;
  userGoal?: string;
  extraContext?: string;
  toneSettings: unknown;
  outputJson: unknown;
  targetLanguage?: string;
  isSaved?: boolean;
}

export async function createAnalysis(input: CreateAnalysisInput, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO analyses (id, user_id, title, original_message, scenario, relationship_context, user_goal, extra_context, tone_settings, output_json, target_language, is_saved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.id, input.userId, input.title ?? null, input.originalMessage, input.scenario ?? null,
      input.relationshipContext ?? null, input.userGoal ?? null, input.extraContext ?? null,
      JSON.stringify(input.toneSettings ?? {}), JSON.stringify(input.outputJson),
      input.targetLanguage ?? null, input.isSaved ?? false,
    ]
  );
  return rows[0];
}

/** Always scoped by user_id — this IS the authorization boundary, not an afterthought. */
export async function listAnalysesForUser(
  userId: string,
  opts: { savedOnly?: boolean; limit: number; offset: number },
  c?: PoolClient
) {
  const conditions = ['user_id = $1', 'archived = FALSE'];
  const params: unknown[] = [userId];
  if (opts.savedOnly) conditions.push('is_saved = TRUE');

  const { rows } = await client(c).query(
    `SELECT * FROM analyses WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, opts.limit, opts.offset]
  );
  return rows;
}

export async function getAnalysisForUser(id: string, userId: string, c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM analyses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function deleteAnalysisForUser(id: string, userId: string, c?: PoolClient): Promise<boolean> {
  const { rowCount } = await client(c).query(
    `DELETE FROM analyses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function setAnalysisSaved(id: string, userId: string, saved: boolean, c?: PoolClient) {
  const { rows } = await client(c).query(
    `UPDATE analyses SET is_saved = $3 WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId, saved]
  );
  return rows[0] ?? null;
}

export async function countAnalysesThisMonthForUser(userId: string, c?: PoolClient): Promise<number> {
  const { rows } = await client(c).query<{ count: string }>(
    `SELECT COUNT(*) FROM analyses WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
    [userId]
  );
  return Number(rows[0].count);
}

/**
 * Aggregate stats for the monthly report email — count, average score
 * across every scored dimension of every analysis in the window (scores
 * live as a JSONB array of {dimension, score} per analysis, so this
 * unnests and averages across all of them), the single most frequent
 * landing_status, and how many of the period's analyses were bookmarked
 * (is_saved) as a real, honest proxy for "found this useful enough to
 * keep" — there's no playbook-usage tracking table to report on instead.
 */
export async function getMonthlyStatsForUser(
  userId: string,
  since: Date,
  until: Date,
  c?: PoolClient
): Promise<{
  analysesCount: number;
  avgScore: number | null;
  mostCommonLandingStatus: string | null;
  analysesSavedCount: number;
}> {
  const countRes = await client(c).query<{ count: string; saved_count: string }>(
    `SELECT COUNT(*) AS count, COUNT(*) FILTER (WHERE is_saved) AS saved_count
     FROM analyses WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
    [userId, since, until]
  );
  const analysesCount = Number(countRes.rows[0]?.count ?? 0);
  const analysesSavedCount = Number(countRes.rows[0]?.saved_count ?? 0);

  if (analysesCount === 0) {
    return { analysesCount: 0, avgScore: null, mostCommonLandingStatus: null, analysesSavedCount: 0 };
  }

  const avgRes = await client(c).query<{ avg_score: string | null }>(
    `SELECT AVG((elem->>'score')::numeric) AS avg_score
     FROM analyses, jsonb_array_elements(COALESCE(output_json->'scores', '[]'::jsonb)) AS elem
     WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
    [userId, since, until]
  );
  const avgScore = avgRes.rows[0]?.avg_score !== null && avgRes.rows[0]?.avg_score !== undefined
    ? Math.round(Number(avgRes.rows[0].avg_score))
    : null;

  const statusRes = await client(c).query<{ landing_status: string; freq: string }>(
    `SELECT output_json->'summary'->>'landing_status' AS landing_status, COUNT(*) AS freq
     FROM analyses
     WHERE user_id = $1 AND created_at >= $2 AND created_at < $3 AND output_json->'summary'->>'landing_status' IS NOT NULL
     GROUP BY landing_status
     ORDER BY freq DESC
     LIMIT 1`,
    [userId, since, until]
  );
  const mostCommonLandingStatus = statusRes.rows[0]?.landing_status ?? null;

  return { analysesCount, avgScore, mostCommonLandingStatus, analysesSavedCount };
}
