ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "priority" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_projects_org_key_live" ON "projects" ("org_id", "key") WHERE "deleted_at" is null;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "rank" numeric;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "client_visible" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "bump_ticket_version"() RETURNS trigger AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "trg_tickets_bump_version" BEFORE UPDATE ON "tickets" FOR EACH ROW EXECUTE FUNCTION "bump_ticket_version"();
--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "project_statuses" ADD COLUMN IF NOT EXISTS "wip_limit" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_comment_mentions" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL CONSTRAINT "ticket_comment_mentions_org_id_organizations_id_fk" REFERENCES "organizations"("id"),
  "comment_id" integer NOT NULL CONSTRAINT "ticket_comment_mentions_comment_id_ticket_comments_id_fk" REFERENCES "ticket_comments"("id") ON DELETE cascade,
  "user_id" text NOT NULL CONSTRAINT "ticket_comment_mentions_user_id_users_id_fk" REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_ticket_comment_mentions_comment_user" ON "ticket_comment_mentions" ("comment_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ticket_comment_mentions_org_user" ON "ticket_comment_mentions" ("org_id", "user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_comment_reactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL CONSTRAINT "ticket_comment_reactions_org_id_organizations_id_fk" REFERENCES "organizations"("id"),
  "comment_id" integer NOT NULL CONSTRAINT "ticket_comment_reactions_comment_id_ticket_comments_id_fk" REFERENCES "ticket_comments"("id") ON DELETE cascade,
  "user_id" text NOT NULL CONSTRAINT "ticket_comment_reactions_user_id_users_id_fk" REFERENCES "users"("id"),
  "emoji" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_ticket_comment_reactions_comment_user_emoji" ON "ticket_comment_reactions" ("comment_id", "user_id", "emoji");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_activity" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL CONSTRAINT "ticket_activity_org_id_organizations_id_fk" REFERENCES "organizations"("id"),
  "project_id" integer NOT NULL CONSTRAINT "ticket_activity_project_id_projects_id_fk" REFERENCES "projects"("id") ON DELETE cascade,
  "ticket_id" integer NOT NULL CONSTRAINT "ticket_activity_ticket_id_tickets_id_fk" REFERENCES "tickets"("id") ON DELETE cascade,
  "actor_id" text CONSTRAINT "ticket_activity_actor_id_users_id_fk" REFERENCES "users"("id"),
  "action" text NOT NULL,
  "field" text,
  "from_value" text,
  "to_value" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ticket_activity_ticket_created" ON "ticket_activity" ("ticket_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ticket_activity_project_created" ON "ticket_activity" ("project_id", "created_at");
