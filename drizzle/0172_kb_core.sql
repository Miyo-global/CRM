-- KB-0010: Knowledge Base core — spaces, space members, ACL revision, pages.
-- Idempotent: every statement is IF NOT EXISTS or wrapped in a guard, so
-- pnpm db:apply-pending is a no-op the second time.
-- Streamline source: SB/db/schema/kb/spaces.ts, pages.ts, common/enums.ts.
-- Membership ids are not ported: the CRM has one org per user, so every actor
-- column is user_id text REFERENCES users(id).

DO $$ BEGIN
  CREATE TYPE "kb_audience" AS ENUM ('internal', 'public', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "kb_space_role" AS ENUM ('viewer', 'commenter', 'editor', 'publisher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_spaces" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "audience" "kb_audience" NOT NULL DEFAULT 'internal',
  "icon" text,
  "color" text,
  "branding" jsonb,
  "type" text NOT NULL DEFAULT 'team',
  "default_visibility" text NOT NULL DEFAULT 'org',
  "owning_team_id" text,
  "is_public_help_center" boolean NOT NULL DEFAULT false,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "archived_at" timestamptz,
  "deleted_at" timestamptz,
  CONSTRAINT "uniq_kb_spaces_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_spaces_type" CHECK ("type" IN ('private', 'team', 'company', 'module', 'support', 'project')),
  CONSTRAINT "chk_kb_spaces_default_visibility" CHECK ("default_visibility" IN ('private', 'org', 'public'))
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_spaces_org_slug" ON "kb_spaces" ("org_id", "slug") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_spaces_org_live" ON "kb_spaces" ("org_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_spaces_org_created_by" ON "kb_spaces" ("org_id", "created_by_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_space_members" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "space_id" integer NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text,
  "team" text,
  "space_role" "kb_space_role" NOT NULL DEFAULT 'viewer',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_space_members_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "fk_kb_space_members_org_space" FOREIGN KEY ("org_id", "space_id")
    REFERENCES "kb_spaces" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_space_members_org_space_user" ON "kb_space_members" ("org_id", "space_id", "user_id") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_space_members_org_space_role" ON "kb_space_members" ("org_id", "space_id", "role") WHERE "role" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_space_members_space" ON "kb_space_members" ("space_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_space_members_org_user" ON "kb_space_members" ("org_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_space_members_org_role" ON "kb_space_members" ("org_id", "role");--> statement-breakpoint

-- One revision counter per org. Bumped whenever space access changes, so
-- indexed chunks can tell whether their ACL snapshot is stale.
CREATE TABLE IF NOT EXISTS "kb_space_acl_versions" (
  "org_id" text PRIMARY KEY REFERENCES "organizations"("id") ON DELETE CASCADE,
  "revision" bigint NOT NULL DEFAULT 1
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_pages" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "space_id" integer,
  "parent_page_id" integer,
  "title" text NOT NULL DEFAULT '',
  "icon" text,
  "cover_image" text,
  "content" jsonb,
  "content_text" text,
  "fts" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("content_text", '')), 'B')
  ) STORED,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_locked" boolean NOT NULL DEFAULT false,
  "visibility" text NOT NULL DEFAULT 'org',
  "status" text NOT NULL DEFAULT 'draft',
  "content_type" text NOT NULL DEFAULT 'note',
  "trust_state" text NOT NULL DEFAULT 'unverified',
  "owner_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "last_edited_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "deleted_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "verified_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "verified_at" timestamptz,
  "verified_until" timestamptz,
  "next_review_at" timestamptz,
  "review_interval_days" integer,
  "acl_revision" integer NOT NULL DEFAULT 1,
  "acl_revision_changed_at" timestamptz,
  "content_revision" integer NOT NULL DEFAULT 1,
  "public_token" text,
  "public_token_hash" text,
  "public_token_revision" integer NOT NULL DEFAULT 1,
  "public_slug" text,
  "slug" text,
  "excerpt" text,
  "seo_title" text,
  "seo_description" text,
  "project_id" integer REFERENCES "projects"("id") ON DELETE SET NULL,
  "category_id" integer,
  "source_ticket_id" integer,
  "external_id" text,
  "external_source" text,
  "views" integer DEFAULT 0,
  "helpful_count" integer DEFAULT 0,
  "not_helpful_count" integer DEFAULT 0,
  "legal_hold" boolean NOT NULL DEFAULT false,
  "legal_hold_reason" text,
  "published_at" timestamptz,
  "archived_at" timestamptz,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_pages_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "kb_pages_status_check" CHECK ("status" IN ('draft', 'in_review', 'published', 'archived')),
  CONSTRAINT "kb_pages_trust_state_check" CHECK ("trust_state" IN ('unverified', 'verified', 'verification_expired')),
  CONSTRAINT "kb_pages_visibility_check" CHECK ("visibility" IN ('private', 'org', 'public')),
  CONSTRAINT "kb_pages_content_type_check" CHECK ("content_type" IN (
    'note', 'sop', 'policy', 'support_article', 'troubleshooting',
    'decision_record', 'meeting_notes', 'runbook', 'project_brief', 'playbook'
  )),
  CONSTRAINT "chk_kb_pages_external_ref_paired" CHECK (("external_id" IS NULL) = ("external_source" IS NULL)),
  CONSTRAINT "fk_kb_pages_org_space" FOREIGN KEY ("org_id", "space_id")
    REFERENCES "kb_spaces" ("org_id", "id"),
  CONSTRAINT "fk_kb_pages_org_parent" FOREIGN KEY ("org_id", "parent_page_id")
    REFERENCES "kb_pages" ("org_id", "id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_pages_fts" ON "kb_pages" USING gin ("fts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_org_parent_sort" ON "kb_pages" ("org_id", "parent_page_id", "sort_order") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_org_updated" ON "kb_pages" ("org_id", "updated_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_org_status" ON "kb_pages" ("org_id", "status") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_org_next_review" ON "kb_pages" ("org_id", "next_review_at") WHERE "deleted_at" IS NULL AND "next_review_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_org_deleted" ON "kb_pages" ("org_id", "deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_parent" ON "kb_pages" ("parent_page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_pages_project_id" ON "kb_pages" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_pages_public_token_hash" ON "kb_pages" ("public_token_hash") WHERE "public_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_pages_org_public_slug" ON "kb_pages" ("org_id", "public_slug") WHERE "public_slug" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_pages_org_slug_ref" ON "kb_pages" ("org_id", "slug") WHERE "slug" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_pages_external_ref" ON "kb_pages" ("org_id", "external_source", "external_id") WHERE "external_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_pages_org_source_ticket" ON "kb_pages" ("org_id", "source_ticket_id") WHERE "source_ticket_id" IS NOT NULL;
