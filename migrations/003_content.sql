-- Migration 003: Product content — analyses (user-generated) and
-- templates/playbooks/blog/testimonials (admin-authored, publicly readable).
-- Depends on: 001_core_identity.sql, 002_billing.sql

BEGIN;

CREATE TABLE analyses (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                  VARCHAR(200),
  original_message       TEXT NOT NULL,
  scenario               VARCHAR(100),
  relationship_context   VARCHAR(100),
  user_goal              VARCHAR(100),
  extra_context          TEXT,
  tone_settings          JSONB NOT NULL DEFAULT '{}',
  output_json            JSONB NOT NULL,
  target_language        VARCHAR(16),
  is_saved               BOOLEAN NOT NULL DEFAULT FALSE,
  archived               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_analyses_user_id ON analyses (user_id, created_at DESC);
CREATE INDEX idx_analyses_user_saved ON analyses (user_id) WHERE is_saved = TRUE AND archived = FALSE;
-- GIN index so admin/analytics queries filtering on output_json fields
-- (e.g. landing_status) don't force a sequential scan.
CREATE INDEX idx_analyses_output_json ON analyses USING GIN (output_json);

CREATE TRIGGER trg_analyses_updated_at BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE templates (
  id              TEXT PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  description     TEXT,
  template_text   TEXT,
  goal            VARCHAR(100),
  scenario        VARCHAR(100),
  premium         BOOLEAN NOT NULL DEFAULT FALSE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_templates_active ON templates (active, sort_order) WHERE active = TRUE;
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE playbooks (
  id                  TEXT PRIMARY KEY,
  title               VARCHAR(200) NOT NULL,
  slug                VARCHAR(200) UNIQUE,
  category            VARCHAR(100) NOT NULL,
  summary             TEXT,
  tagline             VARCHAR(255),
  critique            TEXT,
  remedy              TEXT,
  dos                 TEXT[] NOT NULL DEFAULT '{}',
  donts               TEXT[] NOT NULL DEFAULT '{}',
  example_original    TEXT,
  example_rewritten   TEXT,
  content             TEXT,
  premium             BOOLEAN NOT NULL DEFAULT FALSE,
  published           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_playbooks_published ON playbooks (published) WHERE published = TRUE;
CREATE TRIGGER trg_playbooks_updated_at BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE blog_posts (
  id            TEXT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  excerpt       TEXT,
  content       TEXT NOT NULL,
  author        VARCHAR(100),
  read_time     VARCHAR(20),
  published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_blog_posts_published ON blog_posts (published, published_at DESC) WHERE published = TRUE;
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE testimonials (
  id                    TEXT PRIMARY KEY,
  name                  VARCHAR(100) NOT NULL,
  role                  VARCHAR(100),
  quote                 TEXT,
  avatar_url            TEXT,
  stars                 SMALLINT CHECK (stars BETWEEN 1 AND 5),
  scenarios_resolved    VARCHAR(100),
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_testimonials_active ON testimonials (active, sort_order) WHERE active = TRUE;

COMMIT;
