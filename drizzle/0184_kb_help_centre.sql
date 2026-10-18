-- KB-0022: help-centre categories and support knowledge gaps (D5, flagged off).
-- Streamline: SB/db/schema/support/kb.ts, support-kb-gap.ts (1276, 1277).
-- This is also where kb_pages.category_id finally gets its foreign key.

CREATE TABLE IF NOT EXISTS "kb_categories" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "space_id" integer,
  "parent_id" integer,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_published" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_categories_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "fk_kb_categories_org_space" FOREIGN KEY ("org_id", "space_id")
    REFERENCES "kb_spaces" ("org_id", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_kb_categories_org_parent" FOREIGN KEY ("org_id", "parent_id")
    REFERENCES "kb_categories" ("org_id", "id") ON DELETE SET NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_categories_org_space_slug" ON "kb_categories" ("org_id", "space_id", "slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_categories_space" ON "kb_categories" ("space_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_categories_parent" ON "kb_categories" ("parent_id");--> statement-breakpoint

-- KB-0010 left category_id without a foreign key because kb_categories did not
-- exist yet. Add it now, guarded so a re-run is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_kb_pages_org_category'
  ) THEN
    ALTER TABLE "kb_pages"
      ADD CONSTRAINT "fk_kb_pages_org_category"
      FOREIGN KEY ("org_id", "category_id")
      REFERENCES "kb_categories" ("org_id", "id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint

-- Tickets that keep asking the same thing, clustered, so a missing article is
-- visible as a gap rather than as repeat tickets.
CREATE TABLE IF NOT EXISTS "support_knowledge_gaps" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "cluster_key" varchar(500) NOT NULL,
  "representative_question" text NOT NULL,
  "ticket_count" integer NOT NULL DEFAULT 0,
  "sample_ticket_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" text NOT NULL DEFAULT 'OPEN',
  "proposed_article_id" integer,
  "dismissal_reason" text,
  "drafted_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "evidence" jsonb NOT NULL DEFAULT '{"searchQueries": [], "relatedTicketIds": []}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_support_knowledge_gaps_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "support_knowledge_gaps_status_check" CHECK ("status" IN ('OPEN', 'DRAFTED', 'ROUTED', 'PUBLISHED', 'DISMISSED')),
  CONSTRAINT "fk_support_knowledge_gaps_org_article" FOREIGN KEY ("org_id", "proposed_article_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE SET NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_support_knowledge_gaps_org_cluster" ON "support_knowledge_gaps" ("org_id", "cluster_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_knowledge_gaps_org_status_created" ON "support_knowledge_gaps" ("org_id", "status", "created_at");
