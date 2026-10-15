-- Indexes for the queries that run on every dashboard page load (A44).
--
-- organization_members only had UNIQUE (user_id, org_id). Every HR page lists
-- or counts members by org_id, which cannot use that index (user_id leads it),
-- so each page did a sequential scan of the table.
CREATE INDEX IF NOT EXISTS "idx_org_members_org" ON "organization_members" ("org_id");
--> statement-breakpoint
-- Department and status filters on the employee directory, plus the default
-- "active only" listing.
CREATE INDEX IF NOT EXISTS "idx_users_department" ON "users" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users" ("is_active");
--> statement-breakpoint
-- The approver chain walks reportingTo for the sidebar badge on every page.
CREATE INDEX IF NOT EXISTS "idx_users_reporting_to" ON "users" ("reporting_to");
--> statement-breakpoint
-- The skills matrix reads every row for one org.
CREATE INDEX IF NOT EXISTS "idx_employee_skills_org" ON "employee_skills" ("org_id");
