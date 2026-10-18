-- KB-0014: reviews, import/export jobs, the purge ledger and per-org settings.
-- Streamline: SB/db/schema/kb/governance.ts, purge-ledger.ts, settings.ts
-- (migrations 1170, 1193, 2045, 2047, 2059).

CREATE TABLE IF NOT EXISTS "kb_page_reviews" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "requested_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewer_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "due_at" timestamptz,
  "decided_at" timestamptz,
  "decision_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_page_reviews_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_page_reviews_type" CHECK ("type" IN ('approval', 'freshness')),
  CONSTRAINT "chk_kb_page_reviews_status" CHECK ("status" IN ('pending', 'approved', 'rejected')),
  CONSTRAINT "fk_kb_page_reviews_org_page" FOREIGN KEY ("org_id", "page_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_page_reviews_org_status_due" ON "kb_page_reviews" ("org_id", "status", "due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_reviews_org_page" ON "kb_page_reviews" ("org_id", "page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_reviews_org_reviewer" ON "kb_page_reviews" ("org_id", "reviewer_id", "status", "due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_page_reviews_org_requester" ON "kb_page_reviews" ("org_id", "requested_by_id", "status", "due_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_import_jobs" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "source_type" text NOT NULL,
  "file_key" text,
  "status" text NOT NULL DEFAULT 'pending',
  "total_items" integer NOT NULL DEFAULT 0,
  "processed_items" integer NOT NULL DEFAULT 0,
  "succeeded_items" integer NOT NULL DEFAULT 0,
  "failed_items" integer NOT NULL DEFAULT 0,
  "duplicate_items" integer NOT NULL DEFAULT 0,
  "input_options" jsonb,
  "retry_of_job_id" integer,
  "error_report" jsonb,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_import_jobs_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_import_jobs_source_type" CHECK ("source_type" IN ('markdown', 'html', 'zip', 'support_kb')),
  CONSTRAINT "chk_kb_import_jobs_status" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_import_jobs_org_created" ON "kb_import_jobs" ("org_id", "created_at");--> statement-breakpoint
-- One retry per failed job, so a double click cannot fan out into two imports.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_import_jobs_org_retry_of_job" ON "kb_import_jobs" ("org_id", "retry_of_job_id") WHERE "retry_of_job_id" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_export_jobs" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "scope_type" text NOT NULL,
  "scope_id" integer,
  "format" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "file_key" text,
  "expires_at" timestamptz,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_export_jobs_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_export_jobs_scope_type" CHECK ("scope_type" IN ('page', 'all')),
  CONSTRAINT "chk_kb_export_jobs_format" CHECK ("format" IN ('markdown', 'html')),
  CONSTRAINT "chk_kb_export_jobs_status" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT "fk_kb_export_jobs_org_page" FOREIGN KEY ("org_id", "scope_id")
    REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_export_jobs_org_created" ON "kb_export_jobs" ("org_id", "created_at");--> statement-breakpoint

-- An object is written to R2 before the job row points at it, so a crash in
-- between would orphan the file. The attempt is recorded first and reviewed
-- later by the sweeper.
CREATE TABLE IF NOT EXISTS "kb_export_object_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL,
  "storage_key" text NOT NULL,
  "bucket" text NOT NULL DEFAULT 'default',
  "state" text NOT NULL DEFAULT 'planned',
  "export_job_id" integer,
  "review_after_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "kb_export_object_attempts_bucket_check" CHECK ("bucket" = 'default'),
  CONSTRAINT "kb_export_object_attempts_state_check" CHECK ("state" IN ('planned', 'uploaded', 'attached', 'failed'))
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_export_object_attempts_org_key" ON "kb_export_object_attempts" ("org_id", "storage_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_export_object_attempts_org_state_created" ON "kb_export_object_attempts" ("org_id", "state", "created_at");--> statement-breakpoint

-- A purge has to reach several stores (rows, chunks, blobs, caches). One ledger
-- row per store per page, so a partial purge is resumable rather than silent.
CREATE TABLE IF NOT EXISTS "kb_page_purge_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" integer NOT NULL,
  "store" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempt_count" integer NOT NULL DEFAULT 0,
  "failed_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  CONSTRAINT "chk_kb_purge_ledger_store" CHECK ("store" IN (
    'visits', 'favorites', 'source_links', 'reviews', 'versions', 'comments',
    'grants', 'chunks', 'analytics', 'notifications', 'caches', 'public_cdn',
    'connector_projections', 'page_rows', 'blobs'
  )),
  CONSTRAINT "chk_kb_purge_ledger_status" CHECK ("status" IN ('pending', 'completed', 'failed'))
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_purge_ledger_org_page_store" ON "kb_page_purge_ledger" ("org_id", "page_id", "store");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_purge_ledger_org_status_created" ON "kb_page_purge_ledger" ("org_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_purge_ledger_pending_global" ON "kb_page_purge_ledger" ("status", "created_at") WHERE "status" = 'pending';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_settings" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "trash_retention_days" integer NOT NULL DEFAULT 30,
  "chat_history_retention_days" integer DEFAULT 90,
  "hrms_kb_link_enabled" boolean NOT NULL DEFAULT false,
  "hrms_kb_search_enabled" boolean NOT NULL DEFAULT false,
  "hrms_kb_ai_enabled" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_settings_org_id" UNIQUE ("org_id", "id"),
  -- The three HR flags nest: search needs the link, AI needs search.
  CONSTRAINT "chk_kb_settings_hrms_flag_order" CHECK (
    (NOT "hrms_kb_search_enabled" OR "hrms_kb_link_enabled")
    AND (NOT "hrms_kb_ai_enabled" OR "hrms_kb_search_enabled")
  )
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_settings_org" ON "kb_settings" ("org_id");
