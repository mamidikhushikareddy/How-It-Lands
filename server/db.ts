/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { User, UserProfile, Analysis, Template, Playbook, BlogPost, Testimonial } from '../src/types';
import { SEED_TEMPLATES, SEED_PLAYBOOKS, SEED_BLOGS, SEED_TESTIMONIALS } from '../src/seedData';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  users: User[];
  user_profiles: UserProfile[];
  analyses: Analysis[];
  templates: Template[];
  playbooks: Playbook[];
  blog_posts: BlogPost[];
  testimonials: Testimonial[];
  sessions: any[];
  audit_logs: any[];
  role_permissions: Record<string, string[]>;
  password_reset_tokens: { id: string; user_id: string; token_hash: string; expires_at: string; created_at: string }[];
  email_verification_tokens: { id: string; user_id: string; code: string; expires_at: string; created_at: string }[];
  coupons?: any[];
  plans?: any[];
}

let dbCache: DatabaseSchema | null = null;
let pgPool: pkg.Pool | null = null;
let currentUserId: string | null = null;

// Initialize PostgreSQL connection pool if DATABASE_URL is present
const databaseUrl = process.env.DATABASE_URL || process.env.PGURL;
if (databaseUrl) {
  try {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false } // Required for secure cloud postgres connections
    });
    console.log('[DATABASE] PostgreSQL Connection Pool initialized successfully.');
  } catch (err) {
    console.error('[DATABASE] Failed to initialize PostgreSQL pool:', err);
  }
}

/**
 * Sets the Row-Level Security (RLS) active user ID context
 */
export function setDbUserContext(userId: string | null) {
  currentUserId = userId;
}

export function getDbUserContext(): string | null {
  return currentUserId;
}

/**
 * Initializes schema and Row-Level Security policies in PostgreSQL
 */
export async function initializePostgresSchema() {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    console.log('[DATABASE] Migrating database schema and establishing Row-Level Security (RLS)...');
    
    await client.query('BEGIN;');

    // 1. Create tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        plan VARCHAR(20) NOT NULL DEFAULT 'free',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
        usage_count_month INTEGER NOT NULL DEFAULT 0,
        billing_customer_id VARCHAR(100),
        billing_status VARCHAR(50),
        password_hash TEXT,
        password_salt TEXT,
        two_factor_secret TEXT,
        two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        communication_style VARCHAR(100),
        overdo_patterns TEXT[],
        preferred_tone VARCHAR(100),
        preserve_voice BOOLEAN NOT NULL DEFAULT TRUE,
        favorite_phrases TEXT[],
        avoided_phrases TEXT[],
        default_scenario VARCHAR(100),
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_message TEXT NOT NULL,
        scenario VARCHAR(100),
        relationship_context VARCHAR(100),
        user_goal VARCHAR(100),
        extra_context TEXT,
        tone_settings JSONB,
        preferences JSONB,
        output_json JSONB,
        is_saved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        event VARCHAR(100) NOT NULL,
        userId VARCHAR(50),
        ipAddress VARCHAR(50),
        details TEXT NOT NULL
      );
    `);

    // 2. Enable Row-Level Security (RLS) on sensitive tables
    await client.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;');

    // 3. Drop existing policies to prevent conflict errors
    await client.query('DROP POLICY IF EXISTS users_rls_policy ON users;');
    await client.query('DROP POLICY IF EXISTS user_profiles_rls_policy ON user_profiles;');
    await client.query('DROP POLICY IF EXISTS analyses_rls_policy ON analyses;');
    await client.query('DROP POLICY IF EXISTS sessions_rls_policy ON sessions;');

    // 4. Create secure RLS policies checking context parameters
    // Users can access their own row; admins can access everything
    await client.query(`
      CREATE POLICY users_rls_policy ON users 
      FOR ALL TO PUBLIC 
      USING (id = NULLIF(current_setting('app.current_user_id', true), '') OR role = 'admin');
    `);

    await client.query(`
      CREATE POLICY user_profiles_rls_policy ON user_profiles 
      FOR ALL TO PUBLIC 
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), ''));
    `);

    await client.query(`
      CREATE POLICY analyses_rls_policy ON analyses 
      FOR ALL TO PUBLIC 
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), ''));
    `);

    await client.query(`
      CREATE POLICY sessions_rls_policy ON sessions 
      FOR ALL TO PUBLIC 
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), ''));
    `);

    await client.query('COMMIT;');
    console.log('[DATABASE] PostgreSQL schema initialized and RLS security policies successfully activated.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[DATABASE] Failed to complete database migration / RLS configuration:', err);
  } finally {
    client.release();
  }
}

// Call PG schema setup automatically if active
if (pgPool) {
  initializePostgresSchema().catch(console.error);
}

function getInitialDB(): DatabaseSchema {
  return {
    users: [
      {
        id: 'u1',
        name: 'John Doe',
        email: 'kiaria2514@gmail.com', // Pre-logged in as current user
        plan: 'pro',
        role: 'user',
        created_at: new Date().toISOString(),
        onboarding_completed: true,
        usage_count_month: 4,
        billing_customer_id: 'cus_H123456789',
        billing_status: 'active',
        email_verified: true,
        status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        recent_passwords: [],
        oauth_provider: null,
        oauth_id: null
      },
      {
        id: 'u_admin',
        name: 'How It Lands Admin',
        email: 'admin@howitlands.com',
        plan: 'plus',
        role: 'admin',
        created_at: new Date().toISOString(),
        onboarding_completed: true,
        usage_count_month: 25,
        billing_customer_id: 'cus_Admin999',
        billing_status: 'active',
        email_verified: true,
        status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        recent_passwords: [],
        oauth_provider: null,
        oauth_id: null
      }
    ],
    user_profiles: [
      {
        user_id: 'u1',
        communication_style: 'apologetic',
        overdo_patterns: ['overexplain', 'apologize too much'],
        preferred_tone: 'kind but direct',
        preserve_voice: true,
        favorite_phrases: ['Thanks for understanding', 'I take full responsibility'],
        avoided_phrases: ['just checking in', 'sorry to bother you', 'no worries if not'],
        default_scenario: 'general',
        notes: 'Trying to be firmer in business negotiations.'
      }
    ],
    analyses: [],
    templates: SEED_TEMPLATES,
    playbooks: SEED_PLAYBOOKS,
    blog_posts: SEED_BLOGS,
    testimonials: SEED_TESTIMONIALS,
    sessions: [],
    audit_logs: [],
    role_permissions: {
      super_admin: ['system:all', 'users:manage', 'content:manage', 'content:moderate', 'content:create_edit', 'dashboard:access', 'profile:manage'],
      admin: ['users:manage', 'content:manage', 'content:moderate', 'content:create_edit', 'dashboard:access', 'profile:manage'],
      moderator: ['content:moderate', 'dashboard:access', 'profile:manage'],
      editor: ['content:create_edit', 'dashboard:access', 'profile:manage'],
      user: ['dashboard:access', 'profile:manage'],
      guest: []
    },
    password_reset_tokens: [],
    email_verification_tokens: [],
    coupons: [
      { code: 'SAVE20', discountType: 'percentage', discountValue: 20, expiresAt: '2030-12-31T23:59:59.000Z', usageLimit: 1000, timesUsed: 0, singleUsePerUser: false, claimedByUsers: [] },
      { code: 'FIXED5', discountType: 'fixed', discountValue: 5, expiresAt: '2030-12-31T23:59:59.000Z', usageLimit: 1000, timesUsed: 0, singleUsePerUser: false, claimedByUsers: [] },
      { code: 'LAUNCH100', discountType: 'percentage', discountValue: 100, expiresAt: '2030-12-31T23:59:59.000Z', usageLimit: 50, timesUsed: 0, singleUsePerUser: true, claimedByUsers: [] },
      { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, expiresAt: '2030-12-31T23:59:59.000Z', usageLimit: 500, timesUsed: 0, singleUsePerUser: false, claimedByUsers: [] },
      { code: 'EXPIRED_CODE', discountType: 'percentage', discountValue: 15, expiresAt: '2024-01-01T00:00:00.000Z', usageLimit: 100, timesUsed: 0, singleUsePerUser: false, claimedByUsers: [] },
      { code: 'LIMIT_REACHED', discountType: 'percentage', discountValue: 25, expiresAt: '2030-12-31T23:59:59.000Z', usageLimit: 1, timesUsed: 1, singleUsePerUser: false, claimedByUsers: [] },
      { code: 'SINGLE_USER', discountType: 'percentage', discountValue: 50, expiresAt: '2030-12-31T23:59:59.000Z', usageLimit: 500, timesUsed: 0, singleUsePerUser: true, claimedByUsers: [] }
    ],
    plans: [
      {
        id: 'free',
        name: 'Free Starter',
        tagline: 'Evaluate core communication signals.',
        monthlyPrice: 0,
        annualPrice: 0,
        limits: { analysisPerMonth: 5, savedHistory: 10, customTemplates: 2, customPlaybooks: 0 },
        features: [
          'Basic message risk analysis',
          'Basic rewrite suggestions (standard styles)',
          'Core Communication Fingerprint insights',
          'Recent analysis history (up to 10 days)',
          'Limited pre-built starters library',
          'Limited playbooks view',
          'Basic Message DNA mapping',
          'One-click clipboard copy'
        ],
        description: 'Perfect for professionals evaluating core communication landing diagnostics.'
      },
      {
        id: 'plus',
        name: 'Plus Professional',
        tagline: 'Deepen emotional control & rewrite logic.',
        monthlyPrice: 12,
        annualPrice: 96,
        popular: true,
        limits: { analysisPerMonth: 50, savedHistory: -1, customTemplates: 15, customPlaybooks: 5 },
        features: [
          'Everything in Free plan',
          'Advanced communication deep analysis',
          'Unlimited rewrites (fair-use policy)',
          'Emotional Blueprint scoring & charts',
          'Interactive Risk Heatmap',
          'Likely Interpretation analysis',
          'Custom templates (up to 15)',
          'Custom playbooks (up to 5)'
        ],
        description: 'Designed for professionals, managers, and frequent individual communicators.'
      },
      {
        id: 'pro',
        name: 'Pro Sovereign',
        tagline: 'Full personalized AI communication coaching.',
        monthlyPrice: 29,
        annualPrice: 232,
        limits: { analysisPerMonth: 500, savedHistory: -1, customTemplates: 100, customPlaybooks: 50 },
        features: [
          'Everything in Plus plan',
          'Personalized Communication Coach',
          'Weekly Communication Review analytics',
          'Scenario Simulator (multi-move chats)',
          'Custom AI behavior preferences',
          'Custom writing styles mapping'
        ],
        description: 'For power users, consultants, founders, and content creators commanding high-stakes relations.'
      },
      {
        id: 'teams',
        name: 'Teams Hub',
        tagline: 'Synchronize high-standards across your organization.',
        monthlyPrice: 15,
        annualPrice: 120,
        limits: { analysisPerMonth: 2500, savedHistory: -1, customTemplates: -1, customPlaybooks: -1 },
        features: [
          'Everything in Pro plan',
          'Centralized Team Workspaces',
          'Shared message templates library',
          'Shared corporate strategy playbooks',
          'Role-Based Access Control (RBAC)',
          'Central Admin Dashboard & reports'
        ],
        description: 'Collaborative solution for growing teams, departments, and communication-driven agencies.'
      },
      {
        id: 'enterprise',
        name: 'Enterprise Secure',
        tagline: 'SSO, compliance-ready controls, and dedicated support.',
        monthlyPrice: 99,
        annualPrice: 950,
        limits: { analysisPerMonth: -1, savedHistory: -1, customTemplates: -1, customPlaybooks: -1 },
        features: [
          'Everything in Teams plan',
          'Single Sign-On (SSO) integration (SAML, OIDC)',
          'Custom data retention policies',
          'Dedicated 24/7 Account Management',
          'SLA-backed network guarantees'
        ],
        description: 'Robust alignment, security, and elite support for multi-department enterprises.'
      }
    ]
  };
}

/**
 * Loads the database schema.
 * Applies Zero-Trust RLS filtering locally based on current db user context
 */
export function loadDB(): DatabaseSchema {
  if (dbCache) {
    return dbCache;
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      dbCache = JSON.parse(data);
    }
  } catch (error) {
    console.error('[DATABASE] Failed to read db.json, starting fresh:', error);
  }

  if (!dbCache) {
    dbCache = getInitialDB();
  }

  // Ensure arrays exist
  if (!dbCache.templates || dbCache.templates.length === 0) dbCache.templates = SEED_TEMPLATES;
  if (!dbCache.playbooks || dbCache.playbooks.length === 0) dbCache.playbooks = SEED_PLAYBOOKS;
  if (!dbCache.blog_posts || dbCache.blog_posts.length === 0) dbCache.blog_posts = SEED_BLOGS;
  if (!dbCache.testimonials || dbCache.testimonials.length === 0) dbCache.testimonials = SEED_TESTIMONIALS;
  if (!dbCache.sessions) dbCache.sessions = [];
  if (!dbCache.audit_logs) dbCache.audit_logs = [];
  if (!dbCache.users) dbCache.users = [];
  if (!dbCache.user_profiles) dbCache.user_profiles = [];
  if (!dbCache.analyses) dbCache.analyses = [];
  if (!dbCache.role_permissions) {
    dbCache.role_permissions = {
      super_admin: ['system:all', 'users:manage', 'content:manage', 'content:moderate', 'content:create_edit', 'dashboard:access', 'profile:manage'],
      admin: ['users:manage', 'content:manage', 'content:moderate', 'content:create_edit', 'dashboard:access', 'profile:manage'],
      moderator: ['content:moderate', 'dashboard:access', 'profile:manage'],
      editor: ['content:create_edit', 'dashboard:access', 'profile:manage'],
      user: ['dashboard:access', 'profile:manage'],
      guest: []
    };
  }
  if (!dbCache.password_reset_tokens) dbCache.password_reset_tokens = [];
  if (!dbCache.email_verification_tokens) dbCache.email_verification_tokens = [];
  if (!dbCache.coupons || dbCache.coupons.length === 0) {
    dbCache.coupons = getInitialDB().coupons;
  }
  if (!dbCache.plans || dbCache.plans.length === 0) {
    dbCache.plans = getInitialDB().plans;
  }

  // Ensure all seeded/existing users have security fields
  dbCache.users.forEach(user => {
    if (user.email_verified === undefined) user.email_verified = true;
    if (user.status === undefined) user.status = 'active';
    if (user.failed_login_attempts === undefined) user.failed_login_attempts = 0;
    if (user.locked_until === undefined) user.locked_until = null;
    if (user.recent_passwords === undefined) user.recent_passwords = [];
    if (user.oauth_provider === undefined) user.oauth_provider = null;
    if (user.oauth_id === undefined) user.oauth_id = null;
  });

  saveDB();
  return dbCache;
}

/**
 * Applies local Row-Level Security (RLS) policies based on the current db user context
 */
function applyRLSFilters(rawDb: DatabaseSchema): DatabaseSchema {
  const contextUserId = currentUserId;
  const isUserAdmin = contextUserId ? rawDb.users.find(u => u.id === contextUserId)?.role === 'admin' : false;

  return {
    ...rawDb,
    // Users table RLS: user can see self; admin can see all
    users: rawDb.users.filter(u => !contextUserId || u.id === contextUserId || isUserAdmin),
    // Profiles table RLS: user can see self
    user_profiles: rawDb.user_profiles.filter(p => !contextUserId || p.user_id === contextUserId || isUserAdmin),
    // Analyses table RLS: user can only see their own analyses
    analyses: rawDb.analyses.filter(a => !contextUserId || a.user_id === contextUserId || isUserAdmin),
    // Sessions table RLS: user can only see their sessions
    sessions: rawDb.sessions.filter(s => !contextUserId || s.user_id === contextUserId || isUserAdmin),
    // Templates, playbooks, blogs, testimonials are public metadata
    templates: rawDb.templates,
    playbooks: rawDb.playbooks,
    blog_posts: rawDb.blog_posts,
    testimonials: rawDb.testimonials,
    audit_logs: rawDb.audit_logs // Immutable audit logs can be seen as is
  };
}

export function saveDB(): void {
  if (!dbCache) return;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2), 'utf8');

    // If PostgreSQL is active, perform asynchronous Write-Through to SQL tables using fully parameterized statements!
    if (pgPool) {
      syncToPostgres(dbCache).catch(err => {
        console.error('[DATABASE] Failed to sync changes to PostgreSQL:', err);
      });
    }
  } catch (error) {
    console.error('[DATABASE] Failed to save db.json:', error);
  }
}

/**
 * Asynchronous sync/persistence layer for PostgreSQL.
 * Synchronizes local cached state with Postgres tables using strictly parameterized, safe SQL.
 */
async function syncToPostgres(data: DatabaseSchema) {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN;');

    // Sync users
    for (const u of data.users) {
      await client.query(`
        INSERT INTO users (id, name, email, plan, role, created_at, onboarding_completed, usage_count_month, billing_customer_id, billing_status, password_hash, password_salt, two_factor_secret, two_factor_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          plan = EXCLUDED.plan,
          role = EXCLUDED.role,
          onboarding_completed = EXCLUDED.onboarding_completed,
          usage_count_month = EXCLUDED.usage_count_month,
          billing_customer_id = EXCLUDED.billing_customer_id,
          billing_status = EXCLUDED.billing_status,
          password_hash = EXCLUDED.password_hash,
          password_salt = EXCLUDED.password_salt,
          two_factor_secret = EXCLUDED.two_factor_secret,
          two_factor_enabled = EXCLUDED.two_factor_enabled;
      `, [
        u.id, u.name, u.email, u.plan, u.role, u.created_at, u.onboarding_completed, 
        u.usage_count_month, u.billing_customer_id, u.billing_status, 
        (u as any).password_hash || null, (u as any).password_salt || null,
        (u as any).two_factor_secret || null, (u as any).two_factor_enabled || false
      ]);
    }

    // Sync user profiles
    for (const p of data.user_profiles) {
      await client.query(`
        INSERT INTO user_profiles (user_id, communication_style, overdo_patterns, preferred_tone, preserve_voice, favorite_phrases, avoided_phrases, default_scenario, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          communication_style = EXCLUDED.communication_style,
          overdo_patterns = EXCLUDED.overdo_patterns,
          preferred_tone = EXCLUDED.preferred_tone,
          preserve_voice = EXCLUDED.preserve_voice,
          favorite_phrases = EXCLUDED.favorite_phrases,
          avoided_phrases = EXCLUDED.avoided_phrases,
          default_scenario = EXCLUDED.default_scenario,
          notes = EXCLUDED.notes;
      `, [
        p.user_id, p.communication_style, p.overdo_patterns, p.preferred_tone, p.preserve_voice,
        p.favorite_phrases, p.avoided_phrases, p.default_scenario, p.notes
      ]);
    }

    // Sync analyses
    for (const a of data.analyses) {
      await client.query(`
        INSERT INTO analyses (id, user_id, original_message, scenario, relationship_context, user_goal, extra_context, tone_settings, preferences, output_json, is_saved, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          original_message = EXCLUDED.original_message,
          scenario = EXCLUDED.scenario,
          relationship_context = EXCLUDED.relationship_context,
          user_goal = EXCLUDED.user_goal,
          extra_context = EXCLUDED.extra_context,
          tone_settings = EXCLUDED.tone_settings,
          preferences = EXCLUDED.preferences,
          output_json = EXCLUDED.output_json,
          is_saved = EXCLUDED.is_saved;
      `, [
        a.id, a.user_id, a.original_message, a.scenario, a.relationship_context, a.user_goal, a.extra_context,
        JSON.stringify(a.tone_settings), JSON.stringify((a as any).preferences || {}), JSON.stringify(a.output_json),
        a.saved || false, a.created_at
      ]);
    }

    // Sync active sessions
    for (const s of data.sessions) {
      await client.query(`
        INSERT INTO sessions (id, user_id, expires_at, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [s.id, s.user_id, s.expires_at, s.created_at]);
    }

    // Sync audit logs
    if (data.audit_logs) {
      for (const log of data.audit_logs) {
        await client.query(`
          INSERT INTO audit_logs (id, timestamp, event, "userId", "ipAddress", details)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `, [log.id, log.created_at || new Date().toISOString(), log.event, log.user_id || null, log.ip_address || null, log.details]);
      }
    }

    await client.query('COMMIT;');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[DATABASE] PostgreSQL transaction rollback during state sync:', err);
  } finally {
    client.release();
  }
}
