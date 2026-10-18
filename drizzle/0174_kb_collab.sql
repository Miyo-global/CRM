-- KB-0012: versions (append-only), comments and page templates.
-- Streamline: SB/db/schema/kb/page-collab.ts, migrations 1078, 1216, 1217.

CREATE TABLE IF NOT EXISTS "kb_page_versions" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "version_number" integer NOT NULL,
  "title" text NOT NULL DEFAULT '',
  "content" jsonb,
  "content_text" text,
  "excerpt" text,
  "change_summary" text,
  "author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_versions_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "uniq_kb_page_versions_page_version" UNIQUE ("page_id", "version_number"),
  CONSTRAINT "fk_kb_page_versions_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_versions_org_page" ON "kb_page_versions" ("org_id", "page_id");--> statement-breakpoint

-- Version history is the only record of what a page said before an edit, so the
-- table is append-only at the database boundary and not merely by convention.
--
-- A DELETE is allowed only when it arrives through the ON DELETE CASCADE from
-- kb_pages: a referential action is a system trigger, so a cascade always fires
-- this trigger nested (pg_trigger_depth() > 1), and by then the parent page is
-- usually already gone. Both conditions are checked, independently, so a purge
-- keeps working even if one of them stops holding. A direct
-- DELETE FROM kb_page_versions runs at depth 1 with its parent present, and is
-- refused.
--
-- An UPDATE of author_id stays allowed: the column is ON DELETE SET NULL
-- against users, so deleting a user makes Postgres rewrite these rows, and the
-- erasure path has to be able to redact attribution. The content may not change.
--
-- ERRCODE 42501 so a violation reads as a permission failure rather than
-- surfacing a constraint name in a 500.
CREATE OR REPLACE FUNCTION "prevent_kb_page_version_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1
       OR NOT EXISTS (SELECT 1 FROM public.kb_pages WHERE id = OLD.page_id) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION
      'kb_page_versions is append-only; delete the page instead (page %, version %)',
      OLD.page_id, OLD.version_number
      USING ERRCODE = '42501';
  END IF;

  IF OLD.id             IS DISTINCT FROM NEW.id
     OR OLD.org_id         IS DISTINCT FROM NEW.org_id
     OR OLD.page_id        IS DISTINCT FROM NEW.page_id
     OR OLD.version_number IS DISTINCT FROM NEW.version_number
     OR OLD.title          IS DISTINCT FROM NEW.title
     OR OLD.content        IS DISTINCT FROM NEW.content
     OR OLD.content_text   IS DISTINCT FROM NEW.content_text
     OR OLD.excerpt        IS DISTINCT FROM NEW.excerpt
     OR OLD.change_summary IS DISTINCT FROM NEW.change_summary
     OR OLD.created_at     IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION
      'kb_page_versions is append-only; a recorded version may not be rewritten (page %, version %)',
      OLD.page_id, OLD.version_number
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "kb_page_versions_append_only" ON "kb_page_versions";--> statement-breakpoint
CREATE TRIGGER "kb_page_versions_append_only"
BEFORE UPDATE OR DELETE ON "kb_page_versions"
FOR EACH ROW EXECUTE FUNCTION "prevent_kb_page_version_mutation"();--> statement-breakpoint

-- TRUNCATE produces no row event, so a FOR EACH ROW trigger would let one
-- statement erase every recorded version.
CREATE OR REPLACE FUNCTION "prevent_kb_page_version_truncate"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    '% is append-only; TRUNCATE would erase every recorded version', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "kb_page_versions_no_truncate" ON "kb_page_versions";--> statement-breakpoint
CREATE TRIGGER "kb_page_versions_no_truncate"
BEFORE TRUNCATE ON "kb_page_versions"
FOR EACH STATEMENT EXECUTE FUNCTION "prevent_kb_page_version_truncate"();--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_page_comments" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "parent_id" integer,
  "content" text NOT NULL,
  "anchor_block_index" integer,
  "anchor_quote" text,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_comments_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "fk_kb_page_comments_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_kb_page_comments_org_parent" FOREIGN KEY ("org_id", "parent_id")
    REFERENCES "kb_page_comments" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_comments_org_page" ON "kb_page_comments" ("org_id", "page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_comments_parent" ON "kb_page_comments" ("parent_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_page_templates" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text,
  "description" text,
  "content" jsonb,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "use_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_templates_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "uniq_kb_page_templates_org_name" UNIQUE ("org_id", "name")
);
