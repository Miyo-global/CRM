ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "intake_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_projects_intake_token" ON "projects" ("intake_token") WHERE "intake_token" is not null;
--> statement-breakpoint
ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "client_visible" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_client_grants" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL CONSTRAINT "project_client_grants_org_id_organizations_id_fk" REFERENCES "organizations"("id"),
  "project_id" integer NOT NULL CONSTRAINT "project_client_grants_project_id_projects_id_fk" REFERENCES "projects"("id") ON DELETE cascade,
  "user_id" text NOT NULL CONSTRAINT "project_client_grants_user_id_users_id_fk" REFERENCES "users"("id"),
  "can_view_milestones" boolean DEFAULT true NOT NULL,
  "can_view_tasks" boolean DEFAULT false NOT NULL,
  "can_view_comments" boolean DEFAULT false NOT NULL,
  "can_submit_requests" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "expires_at" timestamp,
  "granted_by" text CONSTRAINT "project_client_grants_granted_by_users_id_fk" REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_project_client_grants_active" ON "project_client_grants" ("project_id", "user_id") WHERE "status" = 'ACTIVE';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_client_grants_org_user" ON "project_client_grants" ("org_id", "user_id");
