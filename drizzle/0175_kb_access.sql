-- KB-0013: per-page grants and restrictions.
-- Streamline: SB/db/schema/kb/page-grants.ts, restrictions.ts, migration 1168.
-- A grant is revoked rather than deleted, so the live uniques are partial.

CREATE TABLE IF NOT EXISTS "kb_page_grants" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text,
  "access" text NOT NULL DEFAULT 'view',
  "granted_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  CONSTRAINT "uniq_kb_page_grants_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_page_grants_access" CHECK ("access" IN ('view', 'comment', 'edit', 'manage')),
  CONSTRAINT "chk_kb_page_grants_subject" CHECK (("user_id" IS NOT NULL) OR ("role" IS NOT NULL)),
  CONSTRAINT "fk_kb_page_grants_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_page_grants_live_user" ON "kb_page_grants" ("org_id", "page_id", "user_id") WHERE "revoked_at" IS NULL AND "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_page_grants_live_role" ON "kb_page_grants" ("org_id", "page_id", "role") WHERE "revoked_at" IS NULL AND "role" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_grants_org_user_live" ON "kb_page_grants" ("org_id", "user_id", "page_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_grants_org_role_live" ON "kb_page_grants" ("org_id", "role", "page_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_grants_org_page_live" ON "kb_page_grants" ("org_id", "page_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_grants_org_granted_by" ON "kb_page_grants" ("org_id", "granted_by_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_page_restrictions" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text,
  "team" text,
  "level" text NOT NULL DEFAULT 'view',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_restrictions_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_page_restrictions_level" CHECK ("level" IN ('view', 'edit')),
  CONSTRAINT "fk_kb_page_restrictions_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_restrictions_page" ON "kb_page_restrictions" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_restrictions_org_user" ON "kb_page_restrictions" ("org_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_restrictions_org_page" ON "kb_page_restrictions" ("org_id", "page_id");
