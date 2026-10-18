-- KB-0015: page attachments and Ask sources (uploaded files and pasted notes).
-- Streamline: SB/db/schema/kb/attachments.ts, sources.ts (migrations 1042, 1044).

CREATE TABLE IF NOT EXISTS "kb_page_attachments" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer,
  "file_key" text NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "sha256" text,
  "uploaded_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "uniq_kb_page_attachments_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "fk_kb_page_attachments_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_page_attachments_org_file_key" ON "kb_page_attachments" ("org_id", "file_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_attachments_org_page" ON "kb_page_attachments" ("org_id", "page_id", "created_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_sources" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "space_id" integer,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "file_key" text,
  "file_url" text,
  "mime_type" text,
  "file_size" integer,
  "note_text" text,
  "status" text NOT NULL DEFAULT 'processing',
  "chunk_count" integer NOT NULL DEFAULT 0,
  "error_message" text,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "uniq_kb_sources_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_sources_kind" CHECK ("kind" IN ('file', 'note')),
  CONSTRAINT "chk_kb_sources_status" CHECK ("status" IN ('processing', 'ready', 'failed')),
  CONSTRAINT "fk_kb_sources_org_space" FOREIGN KEY ("org_id", "space_id")
    REFERENCES "kb_spaces" ("org_id", "id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_sources_org_space" ON "kb_sources" ("org_id", "space_id");
