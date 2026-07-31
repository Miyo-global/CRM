-- QA batch 2: additive schema fixes (5 new tables + 3 new nullable/defaulted columns)

-- 1. Document assignments (assignee + assigner)
CREATE TABLE IF NOT EXISTS "document_assignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "document_id" integer NOT NULL REFERENCES "documents"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "assigned_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_document_assignments_doc_user"
  ON "document_assignments" ("document_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_document_assignments_org" ON "document_assignments" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_document_assignments_user" ON "document_assignments" ("user_id");

-- 2. Helpdesk ticket comments / activity log
CREATE TABLE IF NOT EXISTS "helpdesk_ticket_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "ticket_id" integer NOT NULL REFERENCES "helpdesk_tickets"("id"),
  "author_id" text REFERENCES "users"("id"),
  "kind" text NOT NULL DEFAULT 'comment',
  "body" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_helpdesk_ticket_comments_ticket" ON "helpdesk_ticket_comments" ("ticket_id");

-- 3. Configurable termination reasons
CREATE TABLE IF NOT EXISTS "termination_reasons" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "label" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_termination_reasons_org" ON "termination_reasons" ("org_id");

-- 4. Job roles (org-wide or department-scoped)
CREATE TABLE IF NOT EXISTS "job_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "department_id" integer REFERENCES "departments"("id"),
  "title" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_job_roles_org_dept_title"
  ON "job_roles" ("org_id", "department_id", "title");
CREATE INDEX IF NOT EXISTS "idx_job_roles_org" ON "job_roles" ("org_id");

-- 5. Offer letter custom variables (placeholder tokens)
CREATE TABLE IF NOT EXISTS "hr_offer_letter_custom_variables" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "variable_key" text NOT NULL,
  "label" text NOT NULL,
  "description" text,
  "created_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_offer_letter_custom_vars_org_key"
  ON "hr_offer_letter_custom_variables" ("org_id", "variable_key");
CREATE INDEX IF NOT EXISTS "idx_offer_letter_custom_vars_org" ON "hr_offer_letter_custom_variables" ("org_id");

-- 6. employee_skills: certification tracking
ALTER TABLE "employee_skills" ADD COLUMN IF NOT EXISTS "certified_at" timestamp;
ALTER TABLE "employee_skills" ADD COLUMN IF NOT EXISTS "valid_until" date;

-- 7. one_on_one_meetings: additional participants (array of user-id strings)
ALTER TABLE "one_on_one_meetings" ADD COLUMN IF NOT EXISTS "additional_participants" jsonb;

-- 8. terminations: supporting evidence URLs (array of strings)
ALTER TABLE "terminations" ADD COLUMN IF NOT EXISTS "evidence_urls" jsonb;
