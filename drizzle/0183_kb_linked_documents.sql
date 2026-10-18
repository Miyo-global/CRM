-- KB-0021: an HR document published into the KB as a "Company document" (D4).
-- Streamline: SB/db/schema/kb/linked-documents.ts (migrations 1200, 1201).
-- The CRM documents table has no (org_id, id) unique, so document_id is a plain
-- FK with ON DELETE SET NULL and org_id is carried for scoping; status
-- source_removed plus source_removed_at is what survives the source going away.

CREATE TABLE IF NOT EXISTS "kb_linked_documents" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "document_id" integer REFERENCES "documents"("id") ON DELETE SET NULL,
  "version_mode" text NOT NULL DEFAULT 'FOLLOW_LATEST',
  "pinned_version" integer,
  "status" text NOT NULL DEFAULT 'active',
  "space_id" integer,
  "published_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "unpublished_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "unpublished_at" timestamptz,
  "unpublish_reason" text,
  "source_removed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_linked_documents_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_linked_documents_version_mode" CHECK ("version_mode" IN ('FOLLOW_LATEST', 'PINNED')),
  -- A pin needs a version, and a version means a pin.
  CONSTRAINT "chk_kb_linked_documents_pin" CHECK (("version_mode" = 'PINNED') = ("pinned_version" IS NOT NULL)),
  CONSTRAINT "chk_kb_linked_documents_pin_positive" CHECK ("pinned_version" IS NULL OR "pinned_version" >= 1),
  CONSTRAINT "chk_kb_linked_documents_status" CHECK ("status" IN ('active', 'unpublished', 'source_removed')),
  CONSTRAINT "chk_kb_linked_documents_unpublished_stamped" CHECK ("status" = 'active' OR "unpublished_at" IS NOT NULL),
  CONSTRAINT "chk_kb_linked_documents_removed_stamped" CHECK ("status" <> 'source_removed' OR "source_removed_at" IS NOT NULL),
  CONSTRAINT "fk_kb_linked_documents_space_id_org" FOREIGN KEY ("org_id", "space_id")
    REFERENCES "kb_spaces" ("org_id", "id") ON DELETE SET NULL
);--> statement-breakpoint

-- One live publication per document.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_linked_documents_active_document" ON "kb_linked_documents" ("org_id", "document_id") WHERE "status" = 'active' AND "document_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_linked_documents_org_status_published" ON "kb_linked_documents" ("org_id", "status", "published_at" DESC, "id" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_linked_documents_org_document" ON "kb_linked_documents" ("org_id", "document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_linked_documents_org_space" ON "kb_linked_documents" ("org_id", "space_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_linked_document_audiences" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "linked_document_id" integer NOT NULL,
  "kind" text NOT NULL,
  "ref_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_linked_document_audiences_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_linked_document_audiences_kind" CHECK ("kind" IN ('all', 'department', 'role', 'user')),
  -- 'all' carries no ref; every other kind must name one.
  CONSTRAINT "chk_kb_linked_document_audiences_ref" CHECK (("kind" = 'all') = ("ref_id" IS NULL)),
  CONSTRAINT "fk_kb_linked_document_audiences_link_org" FOREIGN KEY ("org_id", "linked_document_id")
    REFERENCES "kb_linked_documents" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_linked_document_audiences_member" ON "kb_linked_document_audiences" ("org_id", "linked_document_id", "kind", (coalesce("ref_id", '')));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_linked_document_audiences_org_kind_ref" ON "kb_linked_document_audiences" ("org_id", "kind", "ref_id");
