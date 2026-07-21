/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PoolClient } from 'pg';
import { pool } from '../pool';

const client = (c?: PoolClient) => c ?? pool;

export async function listActiveTemplates(c?: PoolClient) {
  // The frontend template cards/customize-flow read `t.draft` (see
  // src/App.tsx), but the column is `template_text` — without this alias
  // every template card renders an empty draft and "Customize & Analyze"
  // hands the analyzer a blank string. Aliasing here keeps the DB schema
  // name (which matches what admins edit in the content panel) while
  // giving the frontend the field name it actually consumes.
  const { rows } = await client(c).query(
    `SELECT *, template_text AS draft FROM templates WHERE active = TRUE ORDER BY sort_order ASC`
  );
  return rows;
}

export async function listPublishedPlaybooks(c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM playbooks WHERE published = TRUE ORDER BY title ASC`
  );
  return rows;
}

export async function listPublishedBlogPosts(limit: number, offset: number, c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM blog_posts WHERE published = TRUE ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getBlogPostBySlug(slug: string, c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM blog_posts WHERE slug = $1 AND published = TRUE`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function listActiveTestimonials(c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM testimonials WHERE active = TRUE ORDER BY sort_order ASC`
  );
  return rows;
}

// --- User profile (1:1 with users) ---

export async function getUserProfile(userId: string, c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT * FROM user_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export interface UpsertProfileInput {
  userId: string;
  communicationStyle?: string;
  overdoPatterns?: string[];
  preferredTone?: string;
  preserveVoice?: boolean;
  favoritePhrases?: string[];
  avoidedPhrases?: string[];
  defaultScenario?: string;
  notes?: string;
  timezone?: string;
  locale?: string;
}

export async function upsertUserProfile(input: UpsertProfileInput, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO user_profiles (user_id, communication_style, overdo_patterns, preferred_tone, preserve_voice, favorite_phrases, avoided_phrases, default_scenario, notes, timezone, locale)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10, 'UTC'), COALESCE($11, 'en-US'))
     ON CONFLICT (user_id) DO UPDATE SET
       communication_style = EXCLUDED.communication_style,
       overdo_patterns = EXCLUDED.overdo_patterns,
       preferred_tone = EXCLUDED.preferred_tone,
       preserve_voice = EXCLUDED.preserve_voice,
       favorite_phrases = EXCLUDED.favorite_phrases,
       avoided_phrases = EXCLUDED.avoided_phrases,
       default_scenario = EXCLUDED.default_scenario,
       notes = EXCLUDED.notes,
       timezone = COALESCE(EXCLUDED.timezone, user_profiles.timezone),
       locale = COALESCE(EXCLUDED.locale, user_profiles.locale)
     RETURNING *`,
    [
      input.userId, input.communicationStyle ?? null, input.overdoPatterns ?? [], input.preferredTone ?? null,
      input.preserveVoice ?? true, input.favoritePhrases ?? [], input.avoidedPhrases ?? [],
      input.defaultScenario ?? null, input.notes ?? null, input.timezone ?? null, input.locale ?? null,
    ]
  );
  return rows[0];
}

// --- Admin content management ---
// Upsert-by-id for the admin content editor (templates/playbooks/blog/testimonials).
// Each table already has a unique TEXT primary key matching the app's ID convention.

export async function upsertTemplate(item: Record<string, unknown>, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO templates (id, title, category, description, template_text, goal, scenario, premium, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, category = EXCLUDED.category, description = EXCLUDED.description,
       template_text = EXCLUDED.template_text, goal = EXCLUDED.goal, scenario = EXCLUDED.scenario,
       premium = EXCLUDED.premium, active = EXCLUDED.active, sort_order = EXCLUDED.sort_order
     RETURNING *`,
    [item.id, item.title, item.category, item.description ?? null, item.template_text ?? null,
     item.goal ?? null, item.scenario ?? null, !!item.premium, item.active !== false, item.sort_order ?? 0]
  );
  return rows[0];
}
export async function deleteTemplate(id: string, c?: PoolClient) {
  await client(c).query(`DELETE FROM templates WHERE id = $1`, [id]);
}

export async function upsertPlaybook(item: Record<string, unknown>, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO playbooks (id, title, category, summary, tagline, critique, remedy, dos, donts, example_original, example_rewritten, content, premium, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, category = EXCLUDED.category, summary = EXCLUDED.summary, tagline = EXCLUDED.tagline,
       critique = EXCLUDED.critique, remedy = EXCLUDED.remedy, dos = EXCLUDED.dos, donts = EXCLUDED.donts,
       example_original = EXCLUDED.example_original, example_rewritten = EXCLUDED.example_rewritten,
       content = EXCLUDED.content, premium = EXCLUDED.premium, published = EXCLUDED.published
     RETURNING *`,
    [item.id, item.title, item.category, item.summary ?? null, item.tagline ?? null, item.critique ?? null,
     item.remedy ?? null, item.dos ?? [], item.donts ?? [], item.example_original ?? null,
     item.example_rewritten ?? null, item.content ?? null, !!item.premium, item.published !== false]
  );
  return rows[0];
}
export async function deletePlaybook(id: string, c?: PoolClient) {
  await client(c).query(`DELETE FROM playbooks WHERE id = $1`, [id]);
}

export async function upsertBlogPost(item: Record<string, unknown>, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO blog_posts (id, title, slug, excerpt, content, author, read_time, published, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $8 THEN NOW() ELSE NULL END)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, slug = EXCLUDED.slug, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
       author = EXCLUDED.author, read_time = EXCLUDED.read_time, published = EXCLUDED.published,
       published_at = CASE WHEN EXCLUDED.published AND blog_posts.published_at IS NULL THEN NOW() ELSE blog_posts.published_at END
     RETURNING *`,
    [item.id, item.title, item.slug, item.excerpt ?? null, item.content, item.author ?? null,
     item.read_time ?? null, !!item.published]
  );
  return rows[0];
}
export async function deleteBlogPost(id: string, c?: PoolClient) {
  await client(c).query(`DELETE FROM blog_posts WHERE id = $1`, [id]);
}

export async function upsertTestimonial(item: Record<string, unknown>, c?: PoolClient) {
  const { rows } = await client(c).query(
    `INSERT INTO testimonials (id, name, role, quote, avatar_url, stars, scenarios_resolved, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, role = EXCLUDED.role, quote = EXCLUDED.quote, avatar_url = EXCLUDED.avatar_url,
       stars = EXCLUDED.stars, scenarios_resolved = EXCLUDED.scenarios_resolved, active = EXCLUDED.active,
       sort_order = EXCLUDED.sort_order
     RETURNING *`,
    [item.id, item.name, item.role ?? null, item.quote ?? null, item.avatar_url ?? null,
     item.stars ?? null, item.scenarios_resolved ?? null, item.active !== false, item.sort_order ?? 0]
  );
  return rows[0];
}
export async function deleteTestimonial(id: string, c?: PoolClient) {
  await client(c).query(`DELETE FROM testimonials WHERE id = $1`, [id]);
}

/**
 * Accounts opted into the monthly conversation-trends email, for the
 * scheduled monthly report job to iterate over. Only active
 * (non-suspended, non-deleted) accounts — no point emailing a
 * suspended or soft-deleted account.
 */
export async function listUsersEligibleForMonthlyReport(c?: PoolClient) {
  const { rows } = await client(c).query(
    `SELECT u.id, u.email, u.name
     FROM users u
     JOIN user_profiles p ON p.user_id = u.id
     WHERE p.monthly_reports_enabled = TRUE
       AND u.status = 'active'`
  );
  return rows;
}
