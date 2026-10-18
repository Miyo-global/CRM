-- KB-0016: tags and per-locale translations.
-- Streamline: SB/db/schema/kb/tags.ts, translations.ts (migrations 0657, 2058).

DO $$ BEGIN
  CREATE TYPE "kb_translation_status" AS ENUM ('draft', 'in_progress', 'translated', 'published', 'outdated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_tags" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_tags_org_id" UNIQUE ("org_id", "id")
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_tags_org_slug" ON "kb_tags" ("org_id", "slug");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_page_tags" (
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  CONSTRAINT "kb_page_tags_pkey" PRIMARY KEY ("org_id", "page_id", "tag_id"),
  CONSTRAINT "fk_kb_page_tags_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_kb_page_tags_org_tag" FOREIGN KEY ("org_id", "tag_id")
    REFERENCES "kb_tags" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_tags_org_tag" ON "kb_page_tags" ("org_id", "tag_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_page_translations" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "locale" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "content_text" text NOT NULL DEFAULT '',
  "excerpt" text,
  "status" "kb_translation_status" NOT NULL DEFAULT 'draft',
  "revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_translations_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "uniq_kb_page_translations" UNIQUE ("page_id", "locale"),
  CONSTRAINT "fk_kb_page_translations_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_translations_org_page" ON "kb_page_translations" ("org_id", "page_id");
