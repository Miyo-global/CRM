-- MIYO-0673: an org's own subject and body for one of the ats-* templates.
CREATE TABLE IF NOT EXISTS "ats_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"template_id" text NOT NULL,
	"subject" text,
	"body" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ats_email_templates" ADD CONSTRAINT "ats_email_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ats_email_templates" ADD CONSTRAINT "ats_email_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_ats_email_template_org" ON "ats_email_templates" USING btree ("org_id","template_id");
