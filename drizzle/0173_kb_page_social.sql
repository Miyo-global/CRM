-- KB-0011: favourites, visits and page links.
-- Streamline: SB/db/schema/kb/pages.ts (kbPageFavorites, kbPageVisits, kbPageLinks).

CREATE TABLE IF NOT EXISTS "kb_page_favorites" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_favorites_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "uniq_kb_page_favorites_page_user" UNIQUE ("page_id", "user_id"),
  CONSTRAINT "fk_kb_page_favorites_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_favorites_org_user_sort" ON "kb_page_favorites" ("org_id", "user_id", "sort_order", "created_at");--> statement-breakpoint

-- One row per page per reader, moved forward on each visit, so "recent" is a
-- plain ORDER BY rather than a group-by over a visit log.
CREATE TABLE IF NOT EXISTS "kb_page_visits" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "visited_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_visits_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "uniq_kb_page_visits_page_user" UNIQUE ("page_id", "user_id"),
  CONSTRAINT "fk_kb_page_visits_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_visits_org_user_visited" ON "kb_page_visits" ("org_id", "user_id", "visited_at");--> statement-breakpoint

-- Re-synced from page content on every save: page-to-page links and links to a
-- CRM record (target_type plus target_id).
CREATE TABLE IF NOT EXISTS "kb_page_links" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "source_page_id" integer NOT NULL,
  "target_page_id" integer,
  "target_type" text NOT NULL DEFAULT 'page',
  "target_id" text,
  "label" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_links_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "uniq_kb_page_links_source_target" UNIQUE ("source_page_id", "target_page_id"),
  CONSTRAINT "fk_kb_page_links_org_source" FOREIGN KEY ("org_id", "source_page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_kb_page_links_org_target" FOREIGN KEY ("org_id", "target_page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_page_links_org_source_record" ON "kb_page_links" ("org_id", "source_page_id", "target_type", "target_id") WHERE "target_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_links_org_target" ON "kb_page_links" ("org_id", "target_page_id");
