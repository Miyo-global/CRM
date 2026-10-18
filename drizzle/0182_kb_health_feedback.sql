-- KB-0020: content-health findings and reader feedback.
-- Streamline: SB/db/schema/kb/health-items.ts, page-feedback.ts (1228, 1431).

CREATE TABLE IF NOT EXISTS "kb_health_items" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "kind" text NOT NULL,
  -- Bumped when a rule's definition changes, so an old finding is not
  -- confused with one the current rule would raise.
  "rule_version" integer NOT NULL DEFAULT 1,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "impact" integer NOT NULL DEFAULT 0,
  "state" text NOT NULL DEFAULT 'open',
  "assignee_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "repair_action" text,
  "due_at" timestamptz,
  "detected_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz,
  "dismissed_at" timestamptz,
  "dismissed_reason" text,
  "dismissal_expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_health_items_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_health_items_kind" CHECK ("kind" IN (
    'unowned', 'stale', 'unverified', 'empty', 'overdue_review',
    'broken_link', 'overexposed', 'duplicate_candidate', 'contradictory_claim'
  )),
  CONSTRAINT "chk_kb_health_items_state" CHECK ("state" IN ('open', 'resolved', 'dismissed')),
  CONSTRAINT "chk_kb_health_items_repair_action" CHECK (
    "repair_action" IS NULL OR "repair_action" IN ('assign_owner', 'request_review', 'mark_needs_content')
  ),
  CONSTRAINT "fk_kb_health_items_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

-- One open finding per page per kind per rule version, so a re-scan updates
-- rather than piling up duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_health_items_open" ON "kb_health_items" ("org_id", "page_id", "kind", "rule_version") WHERE "state" = 'open';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_health_items_org_state_impact" ON "kb_health_items" ("org_id", "state", "impact", "id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_health_items_org_kind_state" ON "kb_health_items" ("org_id", "kind", "state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_health_items_org_page" ON "kb_health_items" ("org_id", "page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_health_items_org_assignee" ON "kb_health_items" ("org_id", "assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_health_items_org_due" ON "kb_health_items" ("org_id", "due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_health_items_org_dismissal_expiry" ON "kb_health_items" ("org_id", "dismissal_expires_at");--> statement-breakpoint

-- visitor_id covers the public help centre, where there is no session.
CREATE TABLE IF NOT EXISTS "kb_page_feedback" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "helpful" boolean NOT NULL,
  "comment" text,
  "visitor_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_feedback_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "fk_kb_page_feedback_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_page_feedback_org_page_visitor" ON "kb_page_feedback" ("org_id", "page_id", "visitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_feedback_page" ON "kb_page_feedback" ("page_id");
